"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeColorManager() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const themeColor = resolvedTheme === "dark" ? "#12201A" : "#EDF1E6";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", themeColor);
  }, [resolvedTheme]);

  return null;
}
