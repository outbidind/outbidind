"use server";

import { createClient } from "@/lib/supabase/server";

type AdminListingResult = {
  id: string;
  listing_status: string;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  rejection_reason?: string | null;
};

type AdminActionResponse = {
  success: boolean;
  error?: string;
  listing?: AdminListingResult;
};

async function getAdminUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      error: "You must be logged in.",
    };
  }

  /*
   * IMPORTANT:
   * Do NOT query user_roles directly.
   *
   * Admin status is checked through the secure
   * SECURITY DEFINER RPC.
   */
  const {
    data: isAdmin,
    error: adminError,
  } = await supabase.rpc("is_current_user_admin");

  if (adminError) {
    console.error(
      "Failed to verify admin status:",
      adminError
    );

    return {
      supabase,
      user: null,
      error: "Unable to verify administrator access.",
    };
  }

  if (isAdmin !== true) {
    return {
      supabase,
      user: null,
      error:
        "You are not authorized to manage listings.",
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}


/* =========================================================
   APPROVE LISTING
========================================================= */

export async function approveListing(
  listingId: string
): Promise<AdminActionResponse> {

  const { supabase, user, error } =
    await getAdminUser();

  if (!user) {
    return {
      success: false,
      error: error ?? "Unauthorized.",
    };
  }

  if (!listingId) {
    return {
      success: false,
      error: "Listing ID is required.",
    };
  }

  const {
    data,
    error: rpcError,
  } = await supabase.rpc(
    "admin_approve_listing",
    {
      p_listing_id: listingId,
    }
  );

  if (rpcError) {
    console.error(
      "admin_approve_listing failed:",
      rpcError
    );

    return {
      success: false,
      error: rpcError.message,
    };
  }

  const result =
    data as AdminActionResponse;

  return result;
}


/* =========================================================
   REJECT LISTING
========================================================= */

export async function rejectListing(
  listingId: string,
  rejectionReason: string
): Promise<AdminActionResponse> {

  const { supabase, user, error } =
    await getAdminUser();

  if (!user) {
    return {
      success: false,
      error: error ?? "Unauthorized.",
    };
  }

  if (!listingId) {
    return {
      success: false,
      error: "Listing ID is required.",
    };
  }

  const reason =
    rejectionReason.trim();

  if (!reason) {
    return {
      success: false,
      error:
        "A rejection reason is required.",
    };
  }

  const {
    data,
    error: rpcError,
  } = await supabase.rpc(
    "admin_reject_listing",
    {
      p_listing_id: listingId,
      p_rejection_reason: reason,
    }
  );

  if (rpcError) {
    console.error(
      "admin_reject_listing failed:",
      rpcError
    );

    return {
      success: false,
      error: rpcError.message,
    };
  }

  const result =
    data as AdminActionResponse;

  return result;
}


/* =========================================================
   START AUCTION
========================================================= */

export async function startAuction(
  listingId: string
): Promise<AdminActionResponse> {

  const { supabase, user, error } =
    await getAdminUser();

  if (!user) {
    return {
      success: false,
      error: error ?? "Unauthorized.",
    };
  }

  if (!listingId) {
    return {
      success: false,
      error: "Listing ID is required.",
    };
  }

  const {
    data,
    error: rpcError,
  } = await supabase.rpc(
    "admin_start_auction",
    {
      p_listing_id: listingId,
    }
  );

  if (rpcError) {
    console.error(
      "admin_start_auction failed:",
      rpcError
    );

    return {
      success: false,
      error: rpcError.message,
    };
  }

  const result =
    data as AdminActionResponse;

  return result;
}