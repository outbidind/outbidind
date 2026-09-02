"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

const TEST_LISTING_ID =
  "c81e6026-ec0d-4272-971c-5c99845dc11f";

export async function testSecurityPass() {
  const { data, error } =
    await supabaseAdmin.rpc(
      "auto_approve_security_pass",
      {
        p_listing_id: TEST_LISTING_ID,
      }
    );

  if (error) {
    console.error(
      "Security PASS test failed:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data,
  };
}

export async function testSecurityConcern() {
  const { data, error } =
    await supabaseAdmin.rpc(
      "mark_security_review_result",
      {
        p_listing_id: TEST_LISTING_ID,
        p_result: "concern",
      }
    );

  if (error) {
    console.error(
      "Security CONCERN test failed:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data,
  };
}