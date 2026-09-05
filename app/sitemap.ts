import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { getBusinessPath } from "@/lib/business-url";

type PublicBusinessListing = {
  id: string;
  business_name: string;
  listing_status: string;
  updated_at?: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://outbidind.com";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/live-bids`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/list-your-business`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_business_listings"
  );

  if (error) {
    console.error("Failed to load businesses for sitemap:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    return staticPages;
  }

  const publicBusinesses =
    ((data ?? []) as PublicBusinessListing[]).filter(
      (business) =>
        business.listing_status === "approved" ||
        business.listing_status === "live"
    );

  const businessPages: MetadataRoute.Sitemap =
    publicBusinesses.map((business) => ({
      url: `${baseUrl}${getBusinessPath(
        business.business_name,
        business.id
      )}`,
      lastModified: business.updated_at
        ? new Date(business.updated_at)
        : undefined,
      changeFrequency:
        business.listing_status === "live"
          ? "hourly"
          : "weekly",
      priority:
        business.listing_status === "live"
          ? 0.8
          : 0.7,
    }));

  return [...staticPages, ...businessPages];
}
