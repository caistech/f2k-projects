"use client";

import { useState } from "react";

/**
 * Persistent banner shown at the top of every page when DEMO_MODE=true.
 * Informs visitors they're in a demo environment with fictional data.
 */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50">
      <div className="bg-blue-600 text-white px-6 py-2 flex items-center gap-3 text-sm font-medium border-b-2 border-blue-800 shadow-md">
        <span className="text-lg leading-none" aria-hidden>
          🏠
        </span>
        <span className="flex-1">
          <strong>Demo Environment</strong> — This is a fictional estate with fake data. 
          Nothing here is real and no emails go to real people.{" "}
          <span className="text-blue-200 text-xs">
            Data resets nightly.
          </span>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-xs font-semibold"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default DemoBanner;
