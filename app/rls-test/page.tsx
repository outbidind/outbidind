"use client";

import { createClient } from "@/lib/supabase/client";

const TEST_LISTING_ID =
  "96880a92-b9b3-450b-b5e7-eeac9db09e25";

export default function RlsTestPage() {
  async function runNormalUserBypassTest() {
    const supabase = createClient();

    // ---------------------------------------------------------
    // 1. Verify logged-in user
    // ---------------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert(
        JSON.stringify(
          {
            test:
              "Step 20.5 — Normal user admin bypass security audit",
            overall_result: "FAIL",
            error:
              authError?.message ??
              "You must be logged in.",
          },
          null,
          2
        )
      );

      return;
    }

    // ---------------------------------------------------------
    // 2. Verify this is NOT an admin
    // ---------------------------------------------------------

    const {
      data: isAdmin,
      error: adminCheckError,
    } = await supabase.rpc(
      "is_current_user_admin"
    );

    if (adminCheckError) {
      alert(
        JSON.stringify(
          {
            test:
              "Step 20.5 — Normal user admin bypass security audit",
            overall_result: "FAIL",
            error:
              adminCheckError.message,
          },
          null,
          2
        )
      );

      return;
    }

    if (isAdmin === true) {
      alert(
        JSON.stringify(
          {
            test:
              "Step 20.5 — Normal user admin bypass security audit",
            overall_result: "FAIL",
            error:
              "This is an ADMIN account. Logout and login with the normal user account.",
            user_id: user.id,
            is_admin: true,
          },
          null,
          2
        )
      );

      return;
    }

    // ---------------------------------------------------------
    // 3. Attempt ADMIN APPROVAL as normal user
    // ---------------------------------------------------------

    let approveBlocked = false;
    let approveError: string | null = null;
    let approveResponse: unknown = null;

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_approve_listing",
        {
          p_listing_id: TEST_LISTING_ID,
        }
      );

      approveResponse = data;

      if (error) {
        approveBlocked = true;
        approveError = error.message;
      } else {
        approveBlocked = false;
      }
    } catch (error) {
      approveBlocked = true;
      approveError =
        error instanceof Error
          ? error.message
          : String(error);
    }

    // ---------------------------------------------------------
    // 4. Attempt ADMIN REJECTION as normal user
    // ---------------------------------------------------------

    let rejectBlocked = false;
    let rejectError: string | null = null;
    let rejectResponse: unknown = null;

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_reject_listing",
        {
          p_listing_id: TEST_LISTING_ID,
          p_rejection_reason:
            "UNAUTHORIZED SECURITY TEST",
        }
      );

      rejectResponse = data;

      if (error) {
        rejectBlocked = true;
        rejectError = error.message;
      } else {
        rejectBlocked = false;
      }
    } catch (error) {
      rejectBlocked = true;
      rejectError =
        error instanceof Error
          ? error.message
          : String(error);
    }

    // ---------------------------------------------------------
    // 5. Final security result
    // ---------------------------------------------------------

    const overallPassed =
      approveBlocked &&
      rejectBlocked;

    alert(
      JSON.stringify(
        {
          test:
            "Step 20.5 — Normal user admin bypass security audit",

          overall_result:
            overallPassed
              ? "PASS"
              : "FAIL",

          normal_user_id:
            user.id,

          is_admin:
            isAdmin,

          test_listing_id:
            TEST_LISTING_ID,

          approve_attempt: {
            blocked:
              approveBlocked,

            response:
              approveResponse,

            error:
              approveError,
          },

          reject_attempt: {
            blocked:
              rejectBlocked,

            response:
              rejectResponse,

            error:
              rejectError,
          },

          checks: {
            normal_user_confirmed:
              isAdmin === false,

            admin_approve_blocked:
              approveBlocked,

            admin_reject_blocked:
              rejectBlocked,
          },

          purpose:
            "Verify that a normal authenticated user cannot execute administrator-only approval or rejection operations.",
        },
        null,
        2
      )
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-lg">

        <p className="text-sm font-bold uppercase tracking-wider text-orange-600">
          OutbidInd Security Audit
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Step 20.5
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Normal-user admin bypass security test.
        </p>

        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-900">
            IMPORTANT
          </p>

          <p className="mt-2 text-sm leading-6 text-red-800">
            Logout from the administrator account
            and login with the normal authenticated
            user account.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-bold text-slate-800">
            Test operations
          </p>

          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              • Admin approval RPC
            </li>
            <li>
              • Admin rejection RPC
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={
            runNormalUserBypassTest
          }
          className="mt-7 w-full rounded-xl bg-red-700 px-5 py-4 font-bold text-white hover:bg-red-800"
        >
          Run Normal User Bypass Test
        </button>

        <div className="mt-7 rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-bold text-green-900">
            PASS condition
          </p>

          <p className="mt-2 text-sm leading-6 text-green-800">
            Both administrator RPC operations must
            be blocked for the normal user.
          </p>
        </div>

      </div>
    </main>
  );
}