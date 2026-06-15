"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2"
    >
      <ChevronLeft className="w-4 h-4" /> Back
    </button>
  );
}
