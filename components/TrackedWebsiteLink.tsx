"use client";

import type { MouseEvent, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type TrackedWebsiteLinkProps = {
  href: string;
  listingId: string;
  className?: string;
  children: ReactNode;
};

export default function TrackedWebsiteLink({
  href,
  listingId,
  className,
  children,
}: TrackedWebsiteLinkProps) {
  const handleClick = async (
    event: MouseEvent<HTMLAnchorElement>
  ) => {
    event.preventDefault();

    // Open the new tab synchronously so popup blockers do not
    // prevent the business website from opening after the RPC finishes.
    const newWindow = window.open("", "_blank");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "track_business_click",
        {
          p_listing_id: listingId,
          p_click_type: "website",
        }
      );

      if (error) {
        console.error(
          "Failed to track website click:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Website click tracking failed:",
        error
      );
    } finally {
      if (newWindow) {
        newWindow.location.href = href;
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}