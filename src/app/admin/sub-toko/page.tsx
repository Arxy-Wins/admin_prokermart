"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react";
import ExportButton from "@/components/ExportButton";

type StatusFilter = "semua" | "active" | "inactive" | "suspended";

interface SubToko {
  id_sub_toko: string;
  nama_proker: string;
  status: string;
  id_toko: string;
  toko: { nama_toko: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-red-100 text-red-700",
  suspended: "bg-amber-100 text-amber-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Suspended",
};

export default function SubTokoPage() {
  const [list, setList] = useState<SubToko[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("semua");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sub-toko");
      if (!res.ok) throw new Error("Failed to fetch sub-toko");
      const data = await res.json();
      setList(data);
    } catch (err) {
      console.error("[SubToko - fetch] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/sub-toko", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_sub_toko: id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setList((prev) => prev.map((s) => s.id_sub_toko === id ? { ...s, status } : s));
    } catch (err) {
      console.error("[SubToko - updateStatus] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSubToko = async (s: SubToko) => {
    if (!confirm(`Hapus sub-toko "${s.nama_proker}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionLoading(s.id_sub_toko);
    try {
      const res = await fetch("/api/admin/sub-toko", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_sub_toko: s.id_sub_toko }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setList((prev) => prev.filter((x) => x.id_sub_toko !== s.id_sub_toko));
    } catch (err) {
      console.error("[SubToko - delete] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = list.filter((s) => {
    const matchStatus = filter === "semua" || s.status === filter;
    const matchSearch = s.nama_proker.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "active", label: "Aktif" },
    { key: "inactive", label: "Nonaktif" },
    { key: "suspended", label: "Suspended" },
  ];

  const exportHeaders = ["Nama Sub-Toko", "Toko Induk", "Status"];
  const exportRows = filtered.map((s) => [
    s.nama_proker,
    s.toko?.nama_toko ?? "—",
    STATUS_LABEL[s.status] ?? s.status,
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manajemen Sub-Toko</h1>
          <p className="text-sm text-slate-500">Kelola semua sub-toko (proker) di platform.</p>
        </div>
        <ExportButton filename="sub-toko" title="Data Sub-Toko" headers={exportHeaders} rows={exportRows} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filter === t.key ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari sub-toko..." className="text-sm w-full focus:outline-none" />
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
                  {["Nama Sub-Toko", "Toko Induk", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-slate-400">Tidak ada sub-toko ditemukan.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id_sub_toko} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.nama_proker}</td>
                    <td className="px-4 py-3 text-slate-500">{(s.toko as any)?.nama_toko ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {s.status === "suspended" && (
                          <button onClick={() => updateStatus(s.id_sub_toko, "active")} disabled={actionLoading === s.id_sub_toko}
                            className="flex items-center gap-1 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === s.id_sub_toko ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Aktifkan
                          </button>
                        )}
                        {s.status !== "suspended" && (
                          <button onClick={() => updateStatus(s.id_sub_toko, "suspended")} disabled={actionLoading === s.id_sub_toko}
                            className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === s.id_sub_toko ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Suspend
                          </button>
                        )}
                        <button onClick={() => deleteSubToko(s)} disabled={actionLoading === s.id_sub_toko}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                          {actionLoading === s.id_sub_toko ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Hapus
                        </button>
                      </div>
                    </td>
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
