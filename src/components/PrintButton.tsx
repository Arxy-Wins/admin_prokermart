"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl transition-colors"
    >
      <Printer className="w-3.5 h-3.5" /> Print
    </button>
  );
}
