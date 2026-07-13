"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wifi, WifiOff, Wallet, Loader2 } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrintButton from "@/components/PrintButton";
import PrintHeader from "@/components/PrintHeader";

interface KeuanganSummary {
  gmvOnline: number;
  gmvOffline: number;
  totalPenarikan: number;
}

interface Penarikan {
  id: string;
  jumlah: number;
  nama_bank: string;
  no_rekening: string;
  nama_pemilik: string;
  tgl_tarik: string;
  sub_toko: { nama_proker: string } | null;
}

interface MonthBucket {
  key: string;
  label: string;
  online: number;
  offline: number;
}

interface OrganisasiOption {
  id_organisasi: string;
  nama_organisasi: string;
}

interface SubTokoOption {
  id_sub_toko: string;
  nama_proker: string;
  id_organisasi: string | null;
}

export default function KeuanganPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<KeuanganSummary>({ gmvOnline: 0, gmvOffline: 0, totalPenarikan: 0 });
  const [penarikanList, setPenarikanList] = useState<Penarikan[]>([]);
  const [monthBuckets, setMonthBuckets] = useState<MonthBucket[]>([]);

  const [organisasiOptions, setOrganisasiOptions] = useState<OrganisasiOption[]>([]);
  const [subTokoOptions, setSubTokoOptions] = useState<SubTokoOption[]>([]);
  const [filterOrganisasi, setFilterOrganisasi] = useState("");
  const [filterSubToko, setFilterSubToko] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch("/api/admin/keuangan/filters");
        if (!res.ok) return;
        const data = await res.json();
        setOrganisasiOptions(data.organisasi ?? []);
        setSubTokoOptions(data.subToko ?? []);
      } catch (err) {
        console.error("[Keuangan - fetchFilters] Error:", err);
      }
    }
    fetchFilters();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterOrganisasi) params.set("id_organisasi", filterOrganisasi);
      if (filterSubToko) params.set("id_sub_toko", filterSubToko);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/admin/keuangan?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch keuangan");
      const data = await res.json();
      setSummary({ gmvOnline: data.gmvOnline, gmvOffline: data.gmvOffline, totalPenarikan: data.totalPenarikan });
      setPenarikanList(data.penarikanList ?? []);
      setMonthBuckets(data.monthBuckets ?? []);
    } catch (err) {
      console.error("[Keuangan - fetch] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterOrganisasi, filterSubToko, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleSubToko = filterOrganisasi
    ? subTokoOptions.filter((s) => s.id_organisasi === filterOrganisasi)
    : subTokoOptions;

  const handleOrganisasiChange = (id: string) => {
    setFilterOrganisasi(id);
    setFilterSubToko("");
  };

  const resetFilters = () => {
    setFilterOrganisasi("");
    setFilterSubToko("");
    setDateFrom("");
    setDateTo("");
  };

  const exportHeaders = ["Sub-Toko", "Jumlah", "Bank", "No. Rekening", "Nama Pemilik", "Tgl. Tarik"];
  const exportRows = penarikanList.map((p) => [
    p.sub_toko?.nama_proker ?? "—",
    Number(p.jumlah),
    p.nama_bank,
    p.no_rekening,
    p.nama_pemilik,
    new Date(p.tgl_tarik).toLocaleDateString("id-ID"),
  ]);

  const summaryHeaders = ["Ringkasan", "Nilai"];
  const summaryRows: (string | number)[][] = [
    ["Total GMV", summary.gmvOnline + summary.gmvOffline],
    ["GMV Online", summary.gmvOnline],
    ["GMV Offline", summary.gmvOffline],
    ["Total Ditarik", summary.totalPenarikan],
  ];

  const maxBucket = Math.max(...monthBuckets.map((b) => b.online + b.offline), 1);

  const selectedOrganisasiName = organisasiOptions.find((o) => o.id_organisasi === filterOrganisasi)?.nama_organisasi ?? "";
  const selectedSubTokoName = subTokoOptions.find((s) => s.id_sub_toko === filterSubToko)?.nama_proker ?? "";
  const periodLabel = dateFrom || dateTo ? `${dateFrom || "awal"} s/d ${dateTo || "sekarang"}` : "";

  return (
    <div className="max-w-6xl mx-auto space-y-6 print-area">
      <PrintHeader
        title="Keuangan Platform"
        filters={[
          { label: "Organisasi", value: selectedOrganisasiName },
          { label: "Proker", value: selectedSubTokoName },
          { label: "Periode", value: periodLabel },
        ]}
      />

      <div className="flex items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Keuangan Platform</h1>
          <p className="text-sm text-slate-500">Rekap GMV, penarikan saldo, dan grafik bulanan.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton filename="keuangan" title="Ringkasan Keuangan" headers={summaryHeaders} rows={summaryRows} />
          <PrintButton />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end no-print">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Organisasi</label>
          <select value={filterOrganisasi} onChange={(e) => handleOrganisasiChange(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white min-w-[160px]">
            <option value="">Semua Organisasi</option>
            {organisasiOptions.map((o) => (
              <option key={o.id_organisasi} value={o.id_organisasi}>{o.nama_organisasi}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Proker (Sub-Toko)</label>
          <select value={filterSubToko} onChange={(e) => setFilterSubToko(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white min-w-[160px]">
            <option value="">Semua Proker</option>
            {visibleSubToko.map((s) => (
              <option key={s.id_sub_toko} value={s.id_sub_toko}>{s.nama_proker}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Dari Tanggal</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Sampai Tanggal</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <button onClick={resetFilters}
          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          Reset Filter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total GMV", value: `Rp ${(summary.gmvOnline + summary.gmvOffline).toLocaleString("id-ID")}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "GMV Online", value: `Rp ${summary.gmvOnline.toLocaleString("id-ID")}`, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "GMV Offline", value: `Rp ${summary.gmvOffline.toLocaleString("id-ID")}`, icon: WifiOff, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Total Ditarik", value: `Rp ${summary.totalPenarikan.toLocaleString("id-ID")}`, icon: Wallet, color: "text-violet-600", bg: "bg-violet-50" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className={`w-9 h-9 rounded-full ${s.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`text-base font-black ${s.color} mt-0.5`}>{s.value}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-1">GMV per Bulan</h2>
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> Online</span>
              <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-3 h-2 rounded-sm bg-amber-400 inline-block" /> Offline</span>
            </div>
            {monthBuckets.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Tidak ada data pada rentang ini.</p>
            ) : (
              <div className="flex items-end gap-3 h-36">
                {monthBuckets.map((b) => {
                  const onlinePct = (b.online / maxBucket) * 100;
                  const offlinePct = (b.offline / maxBucket) * 100;
                  return (
                    <div key={b.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "100px" }}>
                        <div className="w-full bg-amber-400 rounded-t-sm" style={{ height: `${offlinePct}%` }} title={`Offline: Rp ${b.offline.toLocaleString("id-ID")}`} />
                        <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: `${onlinePct}%` }} title={`Online: Rp ${b.online.toLocaleString("id-ID")}`} />
                      </div>
                      <p className="text-[9px] text-slate-400 text-center leading-tight">{b.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Riwayat Penarikan Saldo</h2>
              <div className="no-print"><ExportButton filename="penarikan_saldo" title="Riwayat Penarikan Saldo" headers={exportHeaders} rows={exportRows} /></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Sub-Toko", "Jumlah", "Bank", "No. Rekening", "Nama Pemilik", "Tgl. Tarik"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {penarikanList.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">Belum ada penarikan.</td></tr>
                  ) : penarikanList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-700">{(p.sub_toko as any)?.nama_proker ?? "—"}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">Rp {Number(p.jumlah).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-slate-600">{p.nama_bank}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.no_rekening}</td>
                      <td className="px-4 py-3 text-slate-600">{p.nama_pemilik}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.tgl_tarik).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
