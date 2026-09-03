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

  /*
   * Existing approved listing with unpaid payment.
   * Frontend should resume the payment instead of
   * creating another listing.
   */
  resumePayment?: boolean;
  bidAmount?: number;
  businessName?: string;
};

const MINIMUM_NEW_BUSINESS_BID = 99;

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

export async function submitBusinessListing(
  input: SubmitBusinessListingInput
): Promise<SubmitBusinessListingResult> {
  /*
   * =====================================================
   * 1. AUTHENTICATION
   * =====================================================
   */

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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
    input.businessName?.trim() || "";

  const category =
    input.category?.trim() || "";

  const description =
    input.description?.trim() || "";

  const location =
    input.location?.trim() || "";

  const additionalInformation =
    input.additionalInformation?.trim() || null;

  const rawWebsite =
    input.website?.trim() || "";

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
      error: "Business name is required.",
    };
  }

  if (businessName.length > 200) {
    return {
      success: false,
      error:
        "Business name must be 200 characters or less.",
    };
  }

  /*
   * CATEGORY
   *
   * Categories are intentionally independent/free-text.
   * Users can enter any legitimate business category.
   */

  if (!category) {
    return {
      success: false,
      error: "Business category is required.",
    };
  }

  if (category.length > 200) {
    return {
      success: false,
      error:
        "Business category must be 200 characters or less.",
    };
  }

  if (!description) {
    return {
      success: false,
      error:
        "Business description is required.",
    };
  }

  if (description.length > 5000) {
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

  if (location.length > 300) {
    return {
      success: false,
      error:
        "Business location is too long.",
    };
  }

  if (rawWebsite && !website) {
    return {
      success: false,
      error:
        "Please enter a valid business website.",
    };
  }

  if (
    !Number.isFinite(bidAmount) ||
    bidAmount < MINIMUM_NEW_BUSINESS_BID
  ) {
    return {
      success: false,
      error:
        "The minimum bid for a new business is ₹99.",
    };
  }

  /*
   * =====================================================
   * 4. CHECK USER'S EXISTING APPROVED/LIVE LISTINGS
   * =====================================================
   *
   * This check is specifically for RESUME logic.
   *
   * Rejected listings are ignored.
   */

  const {
    data: existingListings,
    error: existingListingError,
  } = await supabaseAdmin
    .from("business_listings")
    .select(
      "id, business_name, location, starting_bid, listing_status, ai_review_status"
    )
    .eq("owner_id", user.id)
    .in("listing_status", [
      "approved",
      "live",
    ]);

  if (existingListingError) {
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

  /*
   * Find an existing listing belonging to the same user.
   *
   * Business name + location are used for resume matching.
   */

  const normalizedBusinessName =
    normalizeText(businessName);

  const normalizedLocation =
    normalizeText(location);

  const existingListing =
    existingListings?.find((listing) => {
      return (
        normalizeText(
          listing.business_name || ""
        ) === normalizedBusinessName &&
        normalizeText(
          listing.location || ""
        ) === normalizedLocation
      );
    });

  if (existingListing) {
    /*
     * ===================================================
     * 4A. CHECK WHETHER THIS LISTING IS ALREADY PAID
     * ===================================================
     */

    const {
      data: paidPayment,
      error: paidPaymentError,
    } = await supabaseAdmin
      .from("payment_orders")
      .select("id")
      .eq(
        "listing_id",
        existingListing.id
      )
      .eq("user_id", user.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();

    if (paidPaymentError) {
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
     * PAID LISTING
     *
     * User cannot create another listing.
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
     * ===================================================
     * 4B. EXISTING LISTING BUT PAYMENT NOT COMPLETED
     * ===================================================
     *
     * Resume the same listing.
     *
     * PaymentPage -> create-order API will reuse an
     * existing pending Razorpay order if one exists.
     */

    return {
      success: true,
      resumePayment: true,
      listingId: existingListing.id,
      businessName:
        existingListing.business_name,
      bidAmount:
        Number(existingListing.starting_bid) ||
        bidAmount,
      securityStatus: "approved",
    };
  }

  /*
   * =====================================================
   * 5. DUPLICATE CHECK
   * =====================================================
   *
   * This catches duplicates against other users/listings.
   */

  const {
    data: duplicateResult,
    error: duplicateError,
  } = await supabaseAdmin.rpc(
    "check_business_duplicate",
    {
      p_business_name: businessName,
      p_location: location,
      p_website: website,
      p_owner_id: user.id,
    }
  );

  if (duplicateError) {
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

  if (duplicateResult?.duplicate === true) {
    return {
      success: false,
      duplicate: true,
      error:
        "This business appears to be already listed. Please check the business name, location, or website and try again.",
    };
  }

  /*
   * =====================================================
   * 6. WEBSITE SECURITY
   * =====================================================
   *
   * Security concern = STOP.
   *
   * NO database listing is created.
   */

  if (website) {
    const websiteResult =
      await checkWebsiteSecurity(website);

    if (
      websiteResult.status === "concern"
    ) {
      console.warn(
        "Business website blocked:",
        {
          domain:
            websiteResult.domain,
          reason:
            websiteResult.reason,
          threats:
            websiteResult.threats,
        }
      );

      return {
        success: false,
        error:
          websiteResult.reason ||
          "This website could not pass our security checks. Please use a different website.",
      };
    }
  }

  /*
   * =====================================================
   * 7. CONTENT SECURITY
   * =====================================================
   *
   * Security concern = STOP.
   *
   * NO database listing is created.
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
        reason: contentIssue,
      }
    );

    return {
      success: false,
      error: contentIssue,
    };
  }

  /*
   * =====================================================
   * 8. ALL CHECKS PASSED
   * =====================================================
   *
   * Create a completely new listing.
   *
   * IMPORTANT:
   * approved != live
   *
   * Payment still needs to be completed.
   */

  const {
    data: listing,
    error: insertError,
  } = await supabaseAdmin
    .from("business_listings")
    .insert({
      owner_id: user.id,
      business_name: businessName,
      category,
      description,
      location,
      starting_bid: bidAmount,
      current_bid: bidAmount,
      business_website: website,
      additional_information:
        additionalInformation,

      listing_status: "approved",
      ai_review_status: "approved",
    })
    .select("id")
    .single();

  if (insertError || !listing) {
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
    listingId: listing.id,
    securityStatus: "approved",
    resumePayment: false,
    businessName,
    bidAmount,
  };
}