"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dataroom", label: "Overview" },
  { href: "/dataroom/documents", label: "Documents" },
  { href: "/dataroom/ask", label: "Ask" },
  { href: "/dataroom/reports", label: "Reports" },
];

async function signOut() {
  const { createBrowserClient } = await import("@supabase/ssr");
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  await supabase.auth.signOut();
  window.location.href = "/dataroom/login";
}

export function DataroomNav({
  name,
  firm,
  ndaPending,
}: {
  name: string;
  firm: string | null;
  ndaPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const items = [
    ...ITEMS,
    ...(ndaPending ? [{ href: "/dataroom/nda", label: "Accept NDA" }] : []),
  ];

  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={`block px-4 py-2.5 rounded-lg text-sm min-h-[44px] no-underline ${
          active ? "bg-[#1B3A5B] text-white" : "text-slate-700 hover:bg-slate-100"
        } ${label === "Accept NDA" ? "font-semibold text-amber-700" : ""}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-14 sticky top-0 z-40">
        <span className="font-bold text-[#1B3A5B]">F2K Data Room</span>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"} />
          </svg>
        </button>
      </div>

      {/* Sidebar (desktop) / drawer (mobile) */}
      <aside
        className={`${open ? "block" : "hidden"} md:block fixed md:top-0 top-14 left-0 z-40 w-full md:w-60 h-[calc(100vh-3.5rem)] md:h-screen bg-white border-r border-slate-200 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-100 hidden md:block">
          <div className="font-bold text-[#1B3A5B]">F2K Data Room</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">{firm || name}</div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">{items.map((i) => link(i.href, i.label))}</nav>
        <div className="p-2 border-t border-slate-100">
          {link("/dataroom/settings", "Settings")}
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2.5 rounded-lg text-sm min-h-[44px] text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
