"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { exportCSV, exportExcel, exportPDF } from "@/lib/export";

interface ExportButtonProps {
  filename: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export default function ExportButton({ filename, title, headers, rows }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const options = [
    { label: "Export CSV", icon: FileText, action: () => exportCSV(filename, headers, rows) },
    { label: "Export Excel", icon: FileSpreadsheet, action: () => exportExcel(filename, headers, rows) },
    { label: "Export PDF", icon: FileDown, action: () => exportPDF(filename, title, headers, rows) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={rows.length === 0}
        className="flex items-center gap-2 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" /> Export
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={() => { opt.action(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" /> {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
