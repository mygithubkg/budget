"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategoriesView } from "@/components/dashboard/CategoriesView";

export default function CategoriesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?tab=categories");
  }, [router]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      <CategoriesView />
    </div>
  );
}
