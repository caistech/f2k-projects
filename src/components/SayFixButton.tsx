"use client";

import { Bug } from "lucide-react";

export function SayFixButton() {
  return (
    <a
      href="https://sayfix.vercel.app/new?product=f2k-projects"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 bg-stone-900 text-white px-4 py-3 rounded-full shadow-lg hover:bg-stone-800 transition-all flex items-center gap-2 font-medium z-50"
    >
      <Bug className="w-5 h-5" />
      Report Issue
    </a>
  );
}
