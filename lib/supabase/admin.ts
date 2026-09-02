import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

/*
 * IMPORTANT
 *
 * This client must ONLY be used on the server.
 *
 * NEVER import this file into:
 * - Client Components
 * - Browser code
 * - "use client" files
 *
 * SUPABASE_SERVICE_ROLE_KEY must NEVER be
 * exposed as NEXT_PUBLIC_*.
 */

export const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );