"use client";

import { useEffect, useState } from "react";

export default function PagePreloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hidePreloader = () => {
      setVisible(false);
    };

    if (document.readyState === "complete") {
      const timer = setTimeout(hidePreloader, 400);

      return () => {
        clearTimeout(timer);
      };
    }

    window.addEventListener("load", hidePreloader);

    return () => {
      window.removeEventListener("load", hidePreloader);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f5f7f9]/95 backdrop-blur-[2px]"
      aria-label="Loading"
      role="status"
    >
      <div className="animate-pulse">
        <img
          src="/icon.png"
          alt="OutbidInd"
          className="h-20 w-20 object-contain opacity-55"
        />
      </div>
    </div>
  );
}