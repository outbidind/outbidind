"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkWebsiteSecurity } from "@/app/actions/website-security";

type SubmitBusinessListingInput = {
  businessName: string;
  category: string;
  description: string;
  location: string;
  website?: string;
  additionalInformation?: string;
  bidAmount: number;
};

type SubmitBusinessListingResult = {
  success: boolean;
  error?: string;
  listingId?: string;
  securityStatus?: "approved";
  duplicate?: boolean;
  resumePayment?: boolean;
  bidAmount?: number;
  businessName?: string;
};

const MINIMUM_NEW_BUSINESS_BID = 99;

/*
 * =========================================================
 * BUSINESS CATEGORIES
 * =========================================================
 *
 * IMPORTANT:
 * This list MUST stay synchronized with the category list
 * used in components/BusinessListingForm.tsx.
 */

const ALLOWED_CATEGORIES = [
  "Accounting & Bookkeeping",
  "Actuarial Services",
  "Advertising",
  "Aerospace & Aviation",
  "Agriculture",
  "Agricultural Equipment",
  "Agricultural Products",
  "Animal Feed",
  "Animal Health",
  "Antiques & Collectibles",
  "App Development",
  "Appliances",
  "Architecture",
  "Art Galleries",
  "Arts & Crafts",
  "Audio & Music",
  "Audio-Visual Services",
  "Automotive",
  "Automotive Parts",
  "Automotive Repair",
  "Automotive Rental",
  "Baby & Maternity",
  "Bakery",
  "Banking",
  "Bars & Pubs",
  "Beauty & Cosmetics",
  "Beauty Salon",
  "Beverage Manufacturing",
  "Bicycle Sales & Repair",
  "Biotechnology",
  "Books & Publishing",
  "Books & Stationery",
  "Building Materials",
  "Business Consulting",
  "Business Process Outsourcing",
  "Business Services",
  "Car Dealership",
  "Car Rental",
  "Car Wash",
  "Catering",
  "Chemical Manufacturing",
  "Childcare & Daycare",
  "Cleaning Services",
  "Clothing & Apparel",
  "Cloud Computing",
  "Coaching & Training",
  "Coffee Shop",
  "Commercial Real Estate",
  "Computer Hardware",
  "Computer Repair",
  "Construction",
  "Construction Equipment",
  "Consumer Electronics",
  "Consumer Goods",
  "Content Creation",
  "Contract Manufacturing",
  "Corporate Services",
  "Courier & Delivery",
  "Cybersecurity",
  "Dairy Products",
  "Dance Studio",
  "Data Analytics",
  "Data Centers",
  "Dental Care",
  "Design Services",
  "Digital Marketing",
  "Digital Products",
  "Disability Services",
  "Disaster Recovery Services",
  "Distribution",
  "Document Services",
  "E-commerce",
  "E-commerce Marketplace",
  "Education",
  "Educational Technology",
  "Electrical Services",
  "Electrical Equipment",
  "Electronics Manufacturing",
  "Employment Services",
  "Energy",
  "Engineering",
  "Entertainment",
  "Environmental Services",
  "Event Management",
  "Event Venue",
  "Export & Import",
  "Fabric & Textiles",
  "Factory & Industrial",
  "Farming",
  "Fashion Design",
  "Fashion Retail",
  "Financial Advisory",
  "Financial Technology (FinTech)",
  "Fine Arts",
  "Fishery & Aquaculture",
  "Fitness & Gym",
  "Florist & Flower Shop",
  "Food & Beverage",
  "Food Manufacturing",
  "Food Processing",
  "Food Delivery",
  "Food Wholesale",
  "Footwear",
  "Forestry & Timber",
  "Freight & Logistics",
  "Furniture",
  "Furniture Manufacturing",
  "Gaming",
  "Garden & Landscaping",
  "Gas & Fuel",
  "General Retail",
  "Gift Shop",
  "Glass Manufacturing",
  "Government Services",
  "Graphic Design",
  "Grocery Store",
  "Hair Salon & Barber",
  "Hardware Store",
  "Health & Wellness",
  "Healthcare",
  "Healthcare Equipment",
  "Healthcare Technology",
  "Home Appliances",
  "Home Decor",
  "Home Improvement",
  "Home Services",
  "Home Security",
  "Horticulture",
  "Hostel",
  "Hotels",
  "Hospitality",
  "Human Resources",
  "Import & Export",
  "Industrial Automation",
  "Industrial Equipment",
  "Industrial Manufacturing",
  "Information Technology",
  "Insurance",
  "Interior Design",
  "Internet Services",
  "Investment Services",
  "Jewellery & Accessories",
  "Kids & Toys",
  "Kitchen & Dining",
  "Laboratory Services",
  "Landscaping",
  "Laundry & Dry Cleaning",
  "Legal Services",
  "Leisure & Recreation",
  "Livestock",
  "Loan & Credit Services",
  "Local Services",
  "Logistics",
  "Luxury Goods",
  "Machinery",
  "Machine Tools",
  "Management Consulting",
  "Manufacturing",
  "Marine & Shipping",
  "Marketing",
  "Media",
  "Medical Devices",
  "Medical Laboratory",
  "Medical Supplies",
  "Mental Wellness Services",
  "Metals & Mining",
  "Mobile App Development",
  "Mobile Phones & Accessories",
  "Mortgage Services",
  "Motorcycle Sales & Repair",
  "Movies & Film Production",
  "Music Production",
  "Music School",
  "Mutual Funds & Asset Management",
  "Natural Resources",
  "News & Journalism",
  "Nonprofit & Social Enterprise",
  "Nursing & Elder Care",
  "Office Supplies",
  "Online Education",
  "Online Services",
  "Optical & Eyewear",
  "Organic Products",
  "Packaging",
  "Paint & Coatings",
  "Personal Care",
  "Personal Finance",
  "Personal Services",
  "Pet Care",
  "Pet Food",
  "Pet Grooming",
  "Pet Shop",
  "Pharmaceuticals",
  "Pharmacy",
  "Photography",
  "Physical Therapy",
  "Printing",
  "Private Security",
  "Professional Services",
  "Property Management",
  "Public Relations",
  "Publishing",
  "Real Estate",
  "Real Estate Development",
  "Real Estate Brokerage",
  "Real Estate Investment",
  "Recycling",
  "Renewable Energy",
  "Rental Services",
  "Repair & Maintenance",
  "Research & Development",
  "Restaurants",
  "Restaurant Technology",
  "Retail",
  "Roadside Assistance",
  "Robotics",
  "Roofing",
  "Safety Equipment",
  "Salon & Spa",
  "School",
  "Scientific Services",
  "Security Services",
  "Senior Care",
  "Shipping",
  "Shopping & E-commerce",
  "Skincare",
  "Software Development",
  "Software as a Service (SaaS)",
  "Solar Energy",
  "Sports",
  "Sports Equipment",
  "Sports Club",
  "Staffing & Recruitment",
  "Storage & Warehousing",
  "Supermarket",
  "Supply Chain Services",
  "Taxi & Ride Services",
  "Telecommunications",
  "Telemedicine",
  "Testing & Inspection",
  "Theatre & Performing Arts",
  "Tourism",
  "Tour Operator",
  "Trade Services",
  "Transportation",
  "Travel Agency",
  "Travel Technology",
  "Trucking",
  "Tutoring",
  "Utilities",
  "Vacation Rental",
  "Veterinary Services",
  "Video Production",
  "Waste Management",
  "Water Services",
  "Web Design & Development",
  "Web Hosting",
  "Wedding Services",
  "Wholesale",
  "Wine & Beverage Services",
  "Wood Products",
  "Yoga & Wellness",
  "Other",
];

function normalizeUrl(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getContentSecurityIssue(
  businessName: string,
  description: string,
  location: string,
  additionalInformation: string | null
): string | null {
  const combined = [
    businessName,
    description,
    location,
    additionalInformation || "",
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const suspiciousPatterns: {
    pattern: RegExp;
    message: string;
  }[] = [
    {
      pattern: /\bmalware\b/i,
      message:
        "Your business information contains a malware-related term that cannot be submitted.",
    },
    {
      pattern: /\bransomware\b/i,
      message:
        "Your business information contains a ransomware-related term that cannot be submitted.",
    },
    {
      pattern:
        /\bphishing\s+(?:kit|page|site|link)\b/i,
      message:
        "Your business information contains phishing-related content that cannot be submitted.",
    },
    {
      pattern:
        /\bcredential\s+steal(?:er|ing)\b/i,
      message:
        "Your business information contains credential-stealing content that cannot be submitted.",
    },
    {
      pattern:
        /\bpassword\s+steal(?:er|ing)\b/i,
      message:
        "Your business information contains password-stealing content that cannot be submitted.",
    },
    {
      pattern: /\bkeylogger\b/i,
      message:
        "Your business information contains keylogger-related content that cannot be submitted.",
    },
    {
      pattern: /\bbotnet\b/i,
      message:
        "Your business information contains botnet-related content that cannot be submitted.",
    },
    {
      pattern: /\bcarding\b/i,
      message:
        "Your business information contains carding-related content that cannot be submitted.",
    },
    {
      pattern:
        /\bstolen\s+(?:credit|debit)\s+cards?\b/i,
      message:
        "Your business information contains stolen-card related content that cannot be submitted.",
    },
    {
      pattern:
        /\bcredit\s+card\s+dumps?\b/i,
      message:
        "Your business information contains credit-card dump related content that cannot be submitted.",
    },
    {
      pattern: /\bcracked\s+software\b/i,
      message:
        "Your business information contains cracked-software related content that cannot be submitted.",
    },
    {
      pattern: /\bwarez\b/i,
      message:
        "Your business information contains warez-related content that cannot be submitted.",
    },
    {
      pattern: /\bexploit\s+kit\b/i,
      message:
        "Your business information contains exploit-kit related content that cannot be submitted.",
    },
    {
      pattern:
        /\bremote\s+access\s+trojan\b/i,
      message:
        "Your business information contains remote-access trojan related content that cannot be submitted.",
    },
    {
      pattern:
        /\b(?:rat|trojan)\s+(?:download|builder|panel)\b/i,
      message:
        "Your business information contains malicious remote-access software content that cannot be submitted.",
    },
  ];

  for (const item of suspiciousPatterns) {
    if (item.pattern.test(combined)) {
      return item.message;
    }
  }

  return null;
}

type WebsiteContentCheckResult = {
  ok: boolean;
  reason?: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function analyzeWebsiteContent(
  website: string
): Promise<WebsiteContentCheckResult> {
  const MAX_REDIRECTS = 3;
  const MAX_HTML_BYTES = 1_000_000;
  const TIMEOUT_MS = 8_000;

  let currentUrl = website;
  const visited = new Set<string>();

  try {
    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount++
    ) {
      const parsedUrl = new URL(currentUrl);
      const normalizedCurrent =
        parsedUrl.toString();

      /*
       * =====================================================
       * DOMAIN-LEVEL ADULT WEBSITE BLOCK
       * =====================================================
       *
       * Run this BEFORE the website fetch so an adult site
       * cannot avoid the content check by returning 403/429
       * to our scanner.
       */
      const hostname = parsedUrl.hostname
        .toLowerCase()
        .replace(/^www\./, "");

      const adultDomainPatterns = [
        /\bporn\b/i,
        /\bporno\b/i,
        /\bpornography\b/i,
        /\bpornographic\b/i,
        /\bxxx\b/i,
        /\bsexcam\b/i,
        /\badultvideo\b/i,
        /\badultvideos\b/i,
        /\badultcontent\b/i,
        /\bnsfw\b/i,
        /\bsexvideo\b/i,
        /\bsexvideos\b/i,
        /\beroticvideo\b/i,
        /\beroticvideos\b/i,
      ];

      if (
        adultDomainPatterns.some(
          (pattern) => pattern.test(hostname)
        )
      ) {
        return {
          ok: false,
          reason:
            "This website appears to be an adult/pornographic website and cannot be listed on OutbidInd.",
        };
      }

      if (
        visited.has(normalizedCurrent)
      ) {
        return {
          ok: false,
          reason:
            "This website has an invalid redirect loop and cannot be listed on OutbidInd.",
        };
      }

      visited.add(normalizedCurrent);

      const securityResult =
        await checkWebsiteSecurity(
          normalizedCurrent
        );

      if (
        securityResult.status ===
        "concern"
      ) {
        return {
          ok: false,
          reason:
            securityResult.reason ||
            "This website could not pass our security checks and cannot be listed on OutbidInd.",
        };
      }

      const controller =
        new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        TIMEOUT_MS
      );

      let response: Response;

      try {
        try {
          response = await fetch(
            normalizedCurrent,
            {
              method: "GET",
              redirect: "manual",
              signal: controller.signal,
              headers: {
                Accept:
                  "text/html,application/xhtml+xml",
                "User-Agent":
                  "OutbidInd-Security-Scanner/1.0",
              },
              cache: "no-store",
            }
          );
        } catch (fetchError) {
          /*
           * The URL has already passed Google Web Risk and
           * SSRF/DNS safety checks above. A timeout, TLS error,
           * DNS/network failure, or another fetch-level error
           * must not be treated as proof that the website is
           * malicious. Large/anti-bot websites can also reject
           * automated scanners.
           */
          console.warn(
            "Website could not be fetched for optional content analysis; Google Web Risk passed:",
            {
              website: normalizedCurrent,
              error: fetchError,
            }
          );

          return {
            ok: true,
          };
        }
      } finally {
        clearTimeout(timeout);
      }

      if (
        response.status >= 300 &&
        response.status < 400
      ) {
        const location =
          response.headers.get(
            "location"
          );

        if (
          !location ||
          redirectCount ===
            MAX_REDIRECTS
        ) {
          return {
            ok: false,
            reason:
              "This website has too many or invalid redirects and cannot be listed on OutbidInd.",
          };
        }

        currentUrl = new URL(
          location,
          normalizedCurrent
        ).toString();

        continue;
      }

      /*
       * Google Web Risk is the authoritative website reputation
       * check. Some legitimate large websites (for example,
       * major marketplaces/apps) may block automated requests
       * with 403/429 or return HTML larger than our local
       * content-analysis limit. Those conditions alone do NOT
       * mean the website is malicious.
       *
       * Therefore:
       * - Web Risk threat/error -> blocked above.
       * - Redirect safety -> enforced above.
       * - 403/429/other non-OK -> allow if Web Risk passed.
       * - Non-HTML response -> allow if Web Risk passed.
       * - HTML larger than the analysis limit -> skip local
       *   content scan and allow if Web Risk passed.
       *
       * Local HTML scanning remains an additional layer when
       * the site can actually be fetched and is small enough
       * to inspect.
       */
      if (!response.ok) {
        console.warn(
          "Website returned a non-OK response; Google Web Risk passed:",
          {
            website: normalizedCurrent,
            status: response.status,
          }
        );

        return {
          ok: true,
        };
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !/text\/html|application\/xhtml\+xml/i.test(
          contentType
        )
      ) {
        console.warn(
          "Website is not HTML; Google Web Risk passed:",
          {
            website: normalizedCurrent,
            contentType,
          }
        );

        return {
          ok: true,
        };
      }

      const contentLength =
        Number(
          response.headers.get(
            "content-length"
          ) || "0"
        );

      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_HTML_BYTES
      ) {
        console.warn(
          "Website HTML is larger than the local analysis limit; Google Web Risk passed:",
          {
            website: normalizedCurrent,
            contentLength,
          }
        );

        return {
          ok: true,
        };
      }

      const html =
        await response.text();

      if (
        new TextEncoder()
          .encode(html)
          .byteLength >
        MAX_HTML_BYTES
      ) {
        console.warn(
          "Website HTML exceeded the local analysis limit; Google Web Risk passed:",
          {
            website: normalizedCurrent,
          }
        );

        return {
          ok: true,
        };
      }

      const title =
        html.match(
          /<title[^>]*>([\s\S]*?)<\/title>/i
        )?.[1] || "";

      const description =
        html.match(
          /<meta[^>]+(?:name|property)=["'](?:description|og:description|rating)["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
        )?.[1] || "";

      const visibleText =
        stripHtml(html);

      const normalized =
        normalizeText(
          `${parsedUrl.hostname} ${title} ${description} ${visibleText}`
        );

      const strongAdultSignals = [
        /\b(porn|pornography|pornographic|xxx|xvideos|xnxx|redtube|sexcam|webcam\s*sex|live\s*sex|sexual\s*services?)\b/i,
        /\b(onlyfans|fansly|manyvids|chaturbate|stripchat|brazzers|pornhub)\b/i,
        /\b(nude|nudity|explicit\s*(?:content|videos?|photos?|images?))\b/i,
      ];

      const adultMatches =
        strongAdultSignals.filter(
          (pattern) =>
            pattern.test(normalized)
        ).length;

      const adultDomain =
        /(?:porn|xxx|sexcam|adultvideo|nsfw)/i.test(
          parsedUrl.hostname
        );

      if (
        adultDomain ||
        adultMatches >= 1
      ) {
        return {
          ok: false,
          reason:
            "This website appears to be an adult/pornographic website or contain adult/pornographic content and cannot be listed on OutbidInd.",
        };
      }

      const suspiciousSignals = [
        /\b(phishing\s*(?:kit|page|site)|credential\s*stealer|password\s*stealer|keylogger|ransomware|malware\s*download|botnet\s*panel)\b/i,
        /\b(stolen\s*(?:credit|debit)\s*cards?|carding\s*shop|credit\s*card\s*dumps?)\b/i,
        /\b(cracked\s*software|warez|illegal\s*downloads?|exploit\s*kit|remote\s*access\s*trojan)\b/i,
      ];

      if (
        suspiciousSignals.some(
          (pattern) =>
            pattern.test(normalized)
        )
      ) {
        return {
          ok: false,
          reason:
            "This website appears to contain suspicious or potentially malicious content and cannot be listed on OutbidInd.",
        };
      }

      if (
        /(?:deceptive\s*site|dangerous\s*site|malicious\s*site|phishing\s*warning|this\s*site\s*may\s*harm|security\s*warning)/i.test(
          normalized
        )
      ) {
        return {
          ok: false,
          reason:
            "This website appears to have a security warning or suspicious content and cannot be listed on OutbidInd.",
        };
      }

      return {
        ok: true,
      };
    }

    return {
      ok: false,
      reason:
        "This website could not complete security analysis and cannot be listed on OutbidInd.",
    };
  } catch (error) {
    console.error(
      "Website content analysis failed:",
      error
    );

    return {
      ok: false,
      reason:
        "This website could not be safely analyzed. Please use a working official business website.",
    };
  }
}

export async function submitBusinessListing(
  input: SubmitBusinessListingInput
): Promise<SubmitBusinessListingResult> {
  /*
   * =====================================================
   * 1. AUTHENTICATION
   * =====================================================
   */

  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user
  ) {
    return {
      success: false,
      error:
        "You must be logged in to submit a business.",
    };
  }

  /*
   * =====================================================
   * 2. NORMALIZE INPUT
   * =====================================================
   */

  const businessName =
    input.businessName?.trim() ||
    "";

  const category =
    input.category?.trim() ||
    "";

  const description =
    input.description?.trim() ||
    "";

  const location =
    input.location?.trim() ||
    "";

  const additionalInformation =
    input.additionalInformation?.trim() ||
    null;

  const rawWebsite =
    input.website?.trim() ||
    "";

  const website =
    normalizeUrl(rawWebsite);

  const bidAmount =
    Number(input.bidAmount);

  /*
   * =====================================================
   * 3. BASIC VALIDATION
   * =====================================================
   */

  if (!businessName) {
    return {
      success: false,
      error:
        "Business name is required.",
    };
  }

  if (
    businessName.length > 200
  ) {
    return {
      success: false,
      error:
        "Business name must be 200 characters or less.",
    };
  }

  /*
   * CATEGORY VALIDATION
   *
   * This now exactly matches the category
   * values from BusinessListingForm.tsx.
   */

  if (
    !category ||
    !ALLOWED_CATEGORIES.includes(
      category
    )
  ) {
    return {
      success: false,
      error:
        "Please select a valid business category.",
    };
  }

  if (!description) {
    return {
      success: false,
      error:
        "Business description is required.",
    };
  }

  if (
    description.length > 5000
  ) {
    return {
      success: false,
      error:
        "Business description is too long.",
    };
  }

  if (!location) {
    return {
      success: false,
      error:
        "Business location is required.",
    };
  }

  if (
    location.length > 300
  ) {
    return {
      success: false,
      error:
        "Business location is too long.",
    };
  }

  /*
   * WEBSITE IS MANDATORY
   */

  if (!rawWebsite) {
    return {
      success: false,
      error:
        "Business website is required. Please enter your official business website.",
    };
  }

  if (!website) {
    return {
      success: false,
      error:
        "Please enter a valid business website.",
    };
  }

  /*
   * BID VALIDATION
   */

  if (
    !Number.isFinite(bidAmount) ||
    bidAmount <
      MINIMUM_NEW_BUSINESS_BID
  ) {
    return {
      success: false,
      error:
        "The minimum bid for a new business is ₹99.",
    };
  }

  /*
   * =====================================================
   * 4. WEBSITE SECURITY + CONTENT ANALYSIS
   * =====================================================
   */

  const websiteAnalysis =
    await analyzeWebsiteContent(
      website
    );

  if (!websiteAnalysis.ok) {
    console.warn(
      "Business website blocked by content/security analysis:",
      {
        website,
        reason:
          websiteAnalysis.reason,
      }
    );

    return {
      success: false,
      error:
        websiteAnalysis.reason ||
        "This website could not pass our security and content checks. Please use a different official business website.",
    };
  }

  /*
   * =====================================================
   * 5. CHECK USER'S EXISTING LISTINGS
   * =====================================================
   */

  const {
    data: existingListings,
    error:
      existingListingError,
  } = await supabaseAdmin
    .from(
      "business_listings"
    )
    .select(
      "id, business_name, location, starting_bid, listing_status, ai_review_status"
    )
    .eq(
      "owner_id",
      user.id
    )
    .in(
      "listing_status",
      [
        "approved",
        "live",
      ]
    );

  if (
    existingListingError
  ) {
    console.error(
      "Existing listing lookup failed:",
      existingListingError
    );

    return {
      success: false,
      error:
        "We couldn't verify your existing business listings. Please try again.",
    };
  }

  const normalizedBusinessName =
    normalizeText(
      businessName
    );

  const normalizedLocation =
    normalizeText(
      location
    );

  const existingListing =
    existingListings?.find(
      (listing) => {
        return (
          normalizeText(
            listing.business_name ||
              ""
          ) ===
            normalizedBusinessName &&
          normalizeText(
            listing.location ||
              ""
          ) ===
            normalizedLocation
        );
      }
    );

  if (existingListing) {
    /*
     * ===================================================
     * CHECK PAID PAYMENT
     * ===================================================
     */

    const {
      data: paidPayment,
      error:
        paidPaymentError,
    } = await supabaseAdmin
      .from(
        "payment_orders"
      )
      .select("id")
      .eq(
        "listing_id",
        existingListing.id
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "paid"
      )
      .limit(1)
      .maybeSingle();

    if (
      paidPaymentError
    ) {
      console.error(
        "Paid payment lookup failed:",
        paidPaymentError
      );

      return {
        success: false,
        error:
          "We couldn't verify the payment status of your existing listing. Please try again.",
      };
    }

    /*
     * ALREADY PAID
     */

    if (paidPayment) {
      return {
        success: false,
        duplicate: true,
        error:
          "This business is already listed and its payment has been completed. You cannot create another listing for it.",
      };
    }

    /*
     * EXISTING LISTING,
     * PAYMENT NOT COMPLETED
     *
     * Resume payment.
     */

    return {
      success: true,
      resumePayment: true,
      listingId:
        existingListing.id,
      businessName:
        existingListing.business_name,
      bidAmount:
        Number(
          existingListing.starting_bid
        ) ||
        bidAmount,
      securityStatus:
        "approved",
    };
  }

  /*
   * =====================================================
   * 6. DUPLICATE CHECK
   * =====================================================
   */

  const {
    data: duplicateResult,
    error: duplicateError,
  } = await supabaseAdmin.rpc(
    "check_business_duplicate",
    {
      p_business_name:
        businessName,

      p_location:
        location,

      p_website:
        website,

      p_owner_id:
        user.id,
    }
  );

  if (
    duplicateError
  ) {
    console.error(
      "Duplicate check failed:",
      duplicateError
    );

    return {
      success: false,
      error:
        "We couldn't verify whether this business is already listed. Please try again.",
    };
  }

  if (
    duplicateResult?.duplicate ===
    true
  ) {
    return {
      success: false,
      duplicate: true,
      error:
        "This business appears to be already listed. Please check the business name, location, or website and try again.",
    };
  }

  /*
   * =====================================================
   * 7. CONTENT SECURITY
   * =====================================================
   */

  const contentIssue =
    getContentSecurityIssue(
      businessName,
      description,
      location,
      additionalInformation
    );

  if (contentIssue) {
    console.warn(
      "Business content blocked:",
      {
        businessName,
        reason:
          contentIssue,
      }
    );

    return {
      success: false,
      error: contentIssue,
    };
  }

  /*
   * =====================================================
   * 8. CREATE NEW LISTING
   * =====================================================
   *
   * Security passed.
   *
   * approved != live
   *
   * Payment is still required.
   */

  const {
    data: listing,
    error: insertError,
  } =
    await supabaseAdmin
      .from(
        "business_listings"
      )
      .insert({
        owner_id:
          user.id,

        business_name:
          businessName,

        category,

        description,

        location,

        starting_bid:
          bidAmount,

        current_bid:
          bidAmount,

        business_website:
          website,

        additional_information:
          additionalInformation,

        listing_status:
          "approved",

        ai_review_status:
          "approved",
      })
      .select("id")
      .single();

  if (
    insertError ||
    !listing
  ) {
    console.error(
      "Business listing insertion failed:",
      {
        message:
          insertError?.message,

        details:
          insertError?.details,

        hint:
          insertError?.hint,

        code:
          insertError?.code,
      }
    );

    return {
      success: false,
      error:
        insertError?.message ||
        "We couldn't create the business listing.",
    };
  }

  /*
   * =====================================================
   * 9. SUCCESS
   * =====================================================
   */

  return {
    success: true,

    listingId:
      listing.id,

    securityStatus:
      "approved",

    resumePayment:
      false,

    businessName,

    bidAmount,
  };
}