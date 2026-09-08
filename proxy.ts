import { updateSession } from "./lib/supabase/proxy";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAINTENANCE_MODE = true;

const MAINTENANCE_BYPASS_KEY =
  process.env.MAINTENANCE_BYPASS_KEY || "";

const BYPASS_COOKIE_NAME =
  "outbidind-maintenance-bypass";

const BYPASS_COOKIE_MAX_AGE =
  60 * 60 * 24;

function copyResponseCookies(
  source: NextResponse,
  target: NextResponse
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function proxy(request: NextRequest) {
  /*
   * =====================================================
   * 1. SUPABASE SESSION
   * =====================================================
   *
   * Keep the existing Supabase session handling intact.
   */
  const supabaseResponse =
    await updateSession(request);

  /*
   * =====================================================
   * 2. MAINTENANCE MODE OFF
   * =====================================================
   */
  if (!MAINTENANCE_MODE) {
    return supabaseResponse;
  }

  const { pathname, searchParams } =
    request.nextUrl;

  /*
   * =====================================================
   * 3. API ROUTES
   * =====================================================
   *
   * Never redirect API routes to the maintenance page.
   * Existing API/payment/security functionality must
   * continue to work normally.
   */
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  /*
   * =====================================================
   * 4. NEXT.JS INTERNAL FILES / STATIC ASSETS
   * =====================================================
   */
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/logo.png" ||
    pathname.startsWith("/images/")
  ) {
    return supabaseResponse;
  }

  /*
   * =====================================================
   * 5. MAINTENANCE PAGE
   * =====================================================
   *
   * The maintenance page itself must be accessible.
   */
  if (pathname === "/maintenance") {
    return supabaseResponse;
  }

  /*
   * =====================================================
   * 6. EXISTING BYPASS COOKIE
   * =====================================================
   *
   * If the user already authenticated through the secret
   * bypass URL, allow access to the normal website.
   */
  const bypassCookie =
    request.cookies.get(
      BYPASS_COOKIE_NAME
    )?.value;

  if (
    MAINTENANCE_BYPASS_KEY &&
    bypassCookie ===
      MAINTENANCE_BYPASS_KEY
  ) {
    return supabaseResponse;
  }

  /*
   * =====================================================
   * 7. SECRET BYPASS URL
   * =====================================================
   *
   * Example:
   *
   * https://www.outbidind.com/?maintenance_key=YOUR_KEY
   *
   * A valid key creates a temporary bypass cookie.
   */
  const maintenanceKey =
    searchParams.get(
      "maintenance_key"
    );

  if (
    MAINTENANCE_BYPASS_KEY &&
    maintenanceKey ===
      MAINTENANCE_BYPASS_KEY
  ) {
    const cleanUrl =
      request.nextUrl.clone();

    cleanUrl.searchParams.delete(
      "maintenance_key"
    );

    const response =
      NextResponse.redirect(
        cleanUrl
      );

    /*
     * Preserve any Supabase cookies that
     * updateSession() may have added.
     */
    copyResponseCookies(
      supabaseResponse,
      response
    );

    response.cookies.set(
      BYPASS_COOKIE_NAME,
      MAINTENANCE_BYPASS_KEY,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge:
          BYPASS_COOKIE_MAX_AGE,
      }
    );

    return response;
  }

  /*
   * =====================================================
   * 8. MAINTENANCE REDIRECT
   * =====================================================
   *
   * Everyone else goes to the maintenance page.
   */
  const maintenanceUrl =
    request.nextUrl.clone();

  maintenanceUrl.pathname =
    "/maintenance";

  maintenanceUrl.search = "";

  const response =
    NextResponse.redirect(
      maintenanceUrl
    );

  /*
   * Preserve Supabase session cookies
   * while redirecting to maintenance.
   */
  copyResponseCookies(
    supabaseResponse,
    response
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};