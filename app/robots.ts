import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/user-panel/",
        "/api/",
      ],
    },
    sitemap: "https://www.outbidind.com/sitemap.xml",
  };
}