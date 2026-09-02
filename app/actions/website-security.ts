"use server";

type WebsiteSecurityResult = {
  status: "pass" | "concern";
  reason?: string;
  domain?: string;
  threats?: string[];
};

const WEB_RISK_API_KEY =
  process.env.GOOGLE_WEB_RISK_API_KEY;

function isPrivateOrReservedIPv4(
  ip: string
): boolean {
  const parts = ip.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return false;
  }

  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) {
    return true;
  }

  // 172.16.0.0/12
  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  // 192.168.0.0/16
  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  // Loopback: 127.0.0.0/8
  if (a === 127) {
    return true;
  }

  // Link-local: 169.254.0.0/16
  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  // Current network / unspecified
  if (a === 0) {
    return true;
  }

  return false;
}

function isPrivateOrReservedIPv6(
  ip: string
): boolean {
  const normalized =
    ip.toLowerCase().trim();

  /*
   * IPv6 loopback
   */
  if (
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }

  /*
   * Unspecified IPv6
   */
  if (
    normalized === "::" ||
    normalized ===
      "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }

  /*
   * IPv4-mapped IPv6 addresses
   *
   * ::ffff:127.0.0.1
   * ::ffff:192.168.1.1
   */
  const ipv4MappedMatch =
    normalized.match(
      /::ffff:(\d+\.\d+\.\d+\.\d+)$/
    );

  if (
    ipv4MappedMatch
  ) {
    return isPrivateOrReservedIPv4(
      ipv4MappedMatch[1]
    );
  }

  /*
   * fc00::/7
   *
   * Unique local addresses.
   */
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }

  /*
   * fe80::/10
   *
   * Link-local addresses.
   */
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

function isIPv4(
  value: string
): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(
    value
  );
}

function isIPv6(
  value: string
): boolean {
  return value.includes(":");
}

async function resolveHostname(
  hostname: string
): Promise<string[]> {
  try {
    const response =
      await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(
          hostname
        )}&type=A`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    const ipv4Addresses =
      Array.isArray(
        data?.Answer
      )
        ? data.Answer
            .filter(
              (answer: any) =>
                answer?.type === 1 &&
                typeof answer?.data ===
                  "string"
            )
            .map(
              (answer: any) =>
                answer.data
            )
        : [];

    return ipv4Addresses;
  } catch {
    return [];
  }
}

async function resolveHostnameIPv6(
  hostname: string
): Promise<string[]> {
  try {
    const response =
      await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(
          hostname
        )}&type=AAAA`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    const ipv6Addresses =
      Array.isArray(
        data?.Answer
      )
        ? data.Answer
            .filter(
              (answer: any) =>
                answer?.type === 28 &&
                typeof answer?.data ===
                  "string"
            )
            .map(
              (answer: any) =>
                answer.data
            )
        : [];

    return ipv6Addresses;
  } catch {
    return [];
  }
}

async function checkDnsSafety(
  hostname: string
): Promise<{
  safe: boolean;
  reason?: string;
}> {
  const ipv4Addresses =
    await resolveHostname(
      hostname
    );

  const ipv6Addresses =
    await resolveHostnameIPv6(
      hostname
    );

  /*
   * If DNS returned IPv4 addresses,
   * inspect them.
   */
  for (
    const address of ipv4Addresses
  ) {
    if (
      isPrivateOrReservedIPv4(
        address
      )
    ) {
      return {
        safe: false,
        reason:
          "The website resolves to a private or reserved IPv4 address.",
      };
    }
  }

  /*
   * Inspect IPv6 addresses too.
   */
  for (
    const address of ipv6Addresses
  ) {
    if (
      isPrivateOrReservedIPv6(
        address
      )
    ) {
      return {
        safe: false,
        reason:
          "The website resolves to a private or reserved IPv6 address.",
      };
    }
  }

  /*
   * No DNS answer is not automatically
   * treated as malicious.
   *
   * Web Risk may still have reputation
   * information for the URL.
   */
  return {
    safe: true,
  };
}

async function checkWebRisk(
  websiteUrl: string
): Promise<{
  safe: boolean;
  threats: string[];
  reason?: string;
}> {
  if (
    !WEB_RISK_API_KEY
  ) {
    console.error(
      "GOOGLE_WEB_RISK_API_KEY is missing."
    );

    /*
     * Fail closed for security review.
     *
     * We do NOT automatically approve a URL
     * when the reputation service is unavailable.
     */
    return {
      safe: false,
      threats: [],
      reason:
        "Website reputation verification is currently unavailable.",
    };
  }

  try {
    const url =
      new URL(
        "https://webrisk.googleapis.com/v1/uris:search"
      );

    url.searchParams.set(
      "key",
      WEB_RISK_API_KEY
    );

    url.searchParams.set(
      "uri",
      websiteUrl
    );

    url.searchParams.append(
      "threatTypes",
      "MALWARE"
    );

    url.searchParams.append(
      "threatTypes",
      "SOCIAL_ENGINEERING"
    );

    url.searchParams.append(
      "threatTypes",
      "UNWANTED_SOFTWARE"
    );

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Google Web Risk request failed:",
        {
          status:
            response.status,
          body:
            errorText,
        }
      );

      return {
        safe: false,
        threats: [],
        reason:
          "Website reputation verification could not be completed.",
      };
    }

    const data =
      await response.json();

    const threats =
      Array.isArray(
        data?.threat?.threatTypes
      )
        ? data.threat.threatTypes
        : [];

    if (
      threats.length > 0
    ) {
      return {
        safe: false,
        threats,
        reason:
          "The website matches a security threat list.",
      };
    }

    return {
      safe: true,
      threats: [],
    };
  } catch (error) {
    console.error(
      "Google Web Risk check error:",
      error
    );

    return {
      safe: false,
      threats: [],
      reason:
        "Website reputation verification could not be completed.",
    };
  }
}

export async function checkWebsiteSecurity(
  websiteUrl: string
): Promise<WebsiteSecurityResult> {
  let parsedUrl: URL;

  /*
   * =====================================================
   * 1. URL VALIDATION
   * =====================================================
   */

  try {
    parsedUrl =
      new URL(
        websiteUrl
      );
  } catch {
    return {
      status: "concern",
      reason:
        "The website URL is invalid.",
    };
  }

  /*
   * =====================================================
   * 2. PROTOCOL
   * =====================================================
   */

  if (
    parsedUrl.protocol !==
      "http:" &&
    parsedUrl.protocol !==
      "https:"
  ) {
    return {
      status: "concern",
      reason:
        "Only HTTP and HTTPS websites are allowed.",
    };
  }

  /*
   * =====================================================
   * 3. HOSTNAME
   * =====================================================
   */

  const hostname =
    parsedUrl.hostname
      .toLowerCase()
      .trim();

  if (!hostname) {
    return {
      status: "concern",
      reason:
        "The website hostname is missing.",
    };
  }

  /*
   * =====================================================
   * 4. DIRECT IP CHECK
   * =====================================================
   */

  if (
    isIPv4(hostname)
  ) {
    if (
      isPrivateOrReservedIPv4(
        hostname
      )
    ) {
      return {
        status: "concern",
        domain:
          hostname,
        reason:
          "The website uses a private or reserved IPv4 address.",
      };
    }
  }

  if (
    isIPv6(hostname)
  ) {
    if (
      isPrivateOrReservedIPv6(
        hostname
      )
    ) {
      return {
        status: "concern",
        domain:
          hostname,
        reason:
          "The website uses a private or reserved IPv6 address.",
      };
    }
  }

  /*
   * =====================================================
   * 5. DNS SAFETY
   * =====================================================
   */

  const dnsResult =
    await checkDnsSafety(
      hostname
    );

  if (
    !dnsResult.safe
  ) {
    return {
      status: "concern",
      domain:
        hostname,
      reason:
        dnsResult.reason,
    };
  }

  /*
   * =====================================================
   * 6. GOOGLE WEB RISK
   * =====================================================
   */

  const webRiskResult =
    await checkWebRisk(
      parsedUrl.toString()
    );

  if (
    !webRiskResult.safe
  ) {
    return {
      status: "concern",
      domain:
        hostname,
      reason:
        webRiskResult.reason ||
        "The website requires additional security review.",
      threats:
        webRiskResult.threats,
    };
  }

  /*
   * =====================================================
   * 7. FINAL PASS
   * =====================================================
   */

  return {
    status: "pass",
    domain:
      hostname,
  };
}