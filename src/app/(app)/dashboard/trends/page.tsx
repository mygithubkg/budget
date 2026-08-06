"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendsView } from "@/components/dashboard/TrendsView";

export const dynamic = "force-dynamic";

export default function TrendsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?tab=trends");
  }, [router]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      <TrendsView />
    </div>
  );
}
