"use server";

type WebsiteSecurityResult = {
  status: "pass" | "concern";
  reason?: string;
  domain?: string;
  threats?: string[];
};

const WEB_RISK_API_KEY =
  process.env.GOOGLE_WEB_RISK_API_KEY;

/*
 * =========================================================
 * IPv4 SAFETY
 * =========================================================
 */

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

  // 127.0.0.0/8
  if (a === 127) {
    return true;
  }

  // 169.254.0.0/16
  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  // 0.0.0.0/8
  if (a === 0) {
    return true;
  }

  return false;
}

/*
 * =========================================================
 * IPv6 SAFETY
 * =========================================================
 */

function isPrivateOrReservedIPv6(
  ip: string
): boolean {
  const normalized =
    ip.toLowerCase().trim();

  // Loopback
  if (
    normalized === "::1" ||
    normalized ===
      "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }

  // Unspecified
  if (
    normalized === "::" ||
    normalized ===
      "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }

  // IPv4-mapped IPv6
  const ipv4MappedMatch =
    normalized.match(
      /::ffff:(\d+\.\d+\.\d+\.\d+)$/
    );

  if (ipv4MappedMatch) {
    return isPrivateOrReservedIPv4(
      ipv4MappedMatch[1]
    );
  }

  // fc00::/7
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }

  // fe80::/10
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

/*
 * =========================================================
 * DNS RESOLUTION
 * =========================================================
 */

async function resolveHostname(
  hostname: string,
  type: "A" | "AAAA"
): Promise<string[]> {
  try {
    const response =
      await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(
          hostname
        )}&type=${type}`,
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

    const expectedType =
      type === "A" ? 1 : 28;

    if (
      !Array.isArray(data?.Answer)
    ) {
      return [];
    }

    return data.Answer
      .filter(
        (answer: unknown) => {
          if (
            typeof answer !==
              "object" ||
            answer === null
          ) {
            return false;
          }

          const item =
            answer as {
              type?: number;
              data?: unknown;
            };

          return (
            item.type === expectedType &&
            typeof item.data ===
              "string"
          );
        }
      )
      .map(
        (answer: {
          data: string;
        }) => answer.data
      );
  } catch {
    return [];
  }
}

/*
 * =========================================================
 * DNS SAFETY
 * =========================================================
 */

async function checkDnsSafety(
  hostname: string
): Promise<{
  safe: boolean;
  reason?: string;
}> {
  /*
   * Direct IPs are checked separately.
   * For hostnames, inspect both IPv4 and IPv6.
   */

  const [
    ipv4Addresses,
    ipv6Addresses,
  ] = await Promise.all([
    resolveHostname(hostname, "A"),
    resolveHostname(hostname, "AAAA"),
  ]);

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
   * No DNS answer is NOT automatically
   * considered malicious.
   *
   * Web Risk remains the reputation authority.
   */

  return {
    safe: true,
  };
}

/*
 * =========================================================
 * GOOGLE WEB RISK
 * =========================================================
 */

async function checkWebRisk(
  websiteUrl: string
): Promise<{
  safe: boolean;
  threats: string[];
  reason?: string;
}> {
  if (!WEB_RISK_API_KEY) {
    console.error(
      "GOOGLE_WEB_RISK_API_KEY is missing."
    );

    /*
     * Fail closed.
     *
     * If Web Risk is unavailable,
     * we do NOT approve the website.
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

    /*
     * Google Web Risk Lookup API
     * supports multiple threatTypes.
     */

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

      /*
       * Do NOT reveal the Google API
       * response or API key to the user.
       */

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

    /*
     * If Google returns one or more
     * threat types, block the website.
     */

    if (threats.length > 0) {
      return {
        safe: false,
        threats,
        reason:
          "The website matches a Google Web Risk security threat list.",
      };
    }

    /*
     * Empty response means the URL
     * was not found on the queried lists.
     */

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

/*
 * =========================================================
 * MAIN WEBSITE SECURITY CHECK
 * =========================================================
 */

export async function checkWebsiteSecurity(
  websiteUrl: string
): Promise<WebsiteSecurityResult> {
  let parsedUrl: URL;

  /*
   * -------------------------------------------------------
   * 1. URL VALIDATION
   * -------------------------------------------------------
   */

  try {
    parsedUrl =
      new URL(websiteUrl);
  } catch {
    return {
      status: "concern",
      reason:
        "The website URL is invalid.",
    };
  }

  /*
   * -------------------------------------------------------
   * 2. HTTP / HTTPS ONLY
   * -------------------------------------------------------
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
   * -------------------------------------------------------
   * 3. HOSTNAME
   * -------------------------------------------------------
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
   * -------------------------------------------------------
   * 4. DIRECT IP SAFETY
   * -------------------------------------------------------
   */

  if (
    isIPv4(hostname) &&
    isPrivateOrReservedIPv4(
      hostname
    )
  ) {
    return {
      status: "concern",
      domain: hostname,
      reason:
        "The website uses a private or reserved IPv4 address.",
    };
  }

  if (
    isIPv6(hostname) &&
    isPrivateOrReservedIPv6(
      hostname
    )
  ) {
    return {
      status: "concern",
      domain: hostname,
      reason:
        "The website uses a private or reserved IPv6 address.",
    };
  }

  /*
   * -------------------------------------------------------
   * 5. DNS SAFETY
   * -------------------------------------------------------
   */

  const dnsResult =
    await checkDnsSafety(
      hostname
    );

  if (!dnsResult.safe) {
    return {
      status: "concern",
      domain: hostname,
      reason:
        dnsResult.reason ||
        "The website failed DNS safety checks.",
    };
  }

  /*
   * -------------------------------------------------------
   * 6. GOOGLE WEB RISK
   * -------------------------------------------------------
   */

  const webRiskResult =
    await checkWebRisk(
      parsedUrl.toString()
    );

  if (!webRiskResult.safe) {
    return {
      status: "concern",
      domain: hostname,
      reason:
        webRiskResult.reason ||
        "The website was identified as unsafe.",
      threats:
        webRiskResult.threats,
    };
  }

  /*
   * -------------------------------------------------------
   * 7. SECURITY PASS
   * -------------------------------------------------------
   */

  return {
    status: "pass",
    domain: hostname,
    threats: [],
  };
}