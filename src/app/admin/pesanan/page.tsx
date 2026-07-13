"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrintButton from "@/components/PrintButton";
import PrintHeader from "@/components/PrintHeader";

type StatusFilter = "semua" | "menunggu_pembayaran" | "menunggu_konfirmasi" | "diproses" | "siap_diambil" | "selesai" | "dibatalkan";

interface Pesanan {
  id_pesanan: string;
  total_harga: number;
  status_pesanan: string;
  tgl_pesan: string;
  sub_toko: { nama_proker: string } | null;
  pembayaran: { metode_pembayaran: string; status_bayar: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  selesai: "bg-emerald-100 text-emerald-700",
  diproses: "bg-blue-100 text-blue-700",
  siap_diambil: "bg-blue-100 text-blue-700",
  menunggu_konfirmasi: "bg-amber-100 text-amber-700",
  menunggu_pembayaran: "bg-amber-100 text-amber-700",
  dibatalkan: "bg-red-100 text-red-700",
};

export default function PesananPage() {
  const [list, setList] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "semua") params.set("status", filter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/admin/pesanan?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch pesanan");
      const data = await res.json();
      setList(data);
    } catch (err) {
      console.error("[Pesanan - fetch] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "menunggu_pembayaran", label: "Menunggu Bayar" },
    { key: "menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
    { key: "diproses", label: "Diproses" },
    { key: "siap_diambil", label: "Siap Diambil" },
    { key: "selesai", label: "Selesai" },
    { key: "dibatalkan", label: "Dibatalkan" },
  ];

  const exportHeaders = ["ID Pesanan", "Sub-Toko", "Total", "Metode Bayar", "Status", "Tgl. Pesan"];
  const exportRows = list.map((o) => [
    o.id_pesanan,
    o.sub_toko?.nama_proker ?? "—",
    Number(o.total_harga),
    o.pembayaran?.metode_pembayaran ?? "—",
    o.status_pesanan,
    new Date(o.tgl_pesan).toLocaleDateString("id-ID"),
  ]);

  const statusLabel = TABS.find((t) => t.key === filter)?.label ?? "Semua";
  const periodLabel = dateFrom || dateTo ? `${dateFrom || "awal"} s/d ${dateTo || "sekarang"}` : "";

  return (
    <div className="max-w-6xl mx-auto space-y-6 print-area">
      <PrintHeader
        title="Monitor Pesanan"
        filters={[
          { label: "Status", value: filter !== "semua" ? statusLabel : "" },
          { label: "Periode", value: periodLabel },
        ]}
      />

      <div className="flex items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Monitor Pesanan</h1>
          <p className="text-sm text-slate-500">Pantau semua transaksi real-time (refresh otomatis 30 detik).</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton filename="pesanan" title="Data Pesanan" headers={exportHeaders} rows={exportRows} />
          <PrintButton />
          <button onClick={fetchData} className="flex items-center gap-2 text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap no-print">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filter === t.key ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <span className="text-slate-400 text-sm">–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["ID Pesanan", "Sub-Toko", "Total", "Metode Bayar", "Status", "Tgl. Pesan"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tidak ada pesanan ditemukan.</td></tr>
                ) : list.map((o) => (
                  <tr key={o.id_pesanan} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.id_pesanan.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-slate-700">{(o.sub_toko as any)?.nama_proker ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">Rp {Number(o.total_harga).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{(o.pembayaran as any)?.metode_pembayaran ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[o.status_pesanan] ?? "bg-slate-100 text-slate-600"}`}>{o.status_pesanan}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(o.tgl_pesan).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
