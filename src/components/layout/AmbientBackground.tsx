"use client";

import React from "react";

export function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Light Mode: Warm Cream Paper Radial Sheen */}
      <div className="absolute inset-0 block dark:hidden bg-[#F8F5EE] creamy-paper-texture" />

      {/* Dark Mode: Deep Obsidian Base + Radial Ambient Glowing Mesh */}
      <div className="absolute inset-0 hidden dark:block dark-designer-mesh" />

      {/* Dark Mode Ambient Soft Glow Orbs */}
      <div className="hidden dark:block absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-indigo-600/[0.07] blur-[140px] pointer-events-none" />
      <div className="hidden dark:block absolute top-[25%] -right-[15%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-emerald-500/[0.05] blur-[150px] pointer-events-none" />
      <div className="hidden dark:block absolute -bottom-[15%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full bg-rose-500/[0.04] blur-[130px] pointer-events-none" />

      {/* Designer Subtle Geometric Grid Overlay */}
      <div className="absolute inset-0 designer-grid-dots opacity-40 dark:opacity-60 pointer-events-none" />
    </div>
  );
}
