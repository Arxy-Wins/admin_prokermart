"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, XCircle, Trash2, Loader2 } from "lucide-react";
import ExportButton from "@/components/ExportButton";

type RoleFilter = "semua" | "pembeli" | "organisasi" | "proker";

interface Pengguna {
  id_pengguna: string;
  nama: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  organisasi: "bg-violet-100 text-violet-700",
  proker: "bg-blue-100 text-blue-700",
  pembeli: "bg-slate-100 text-slate-600",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  suspended: "Suspended",
};

export default function PenggunaPage() {
  const [list, setList] = useState<Pengguna[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoleFilter>("semua");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Pengguna | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/pengguna");
        if (!res.ok) throw new Error("Failed to fetch pengguna");
        const data = await res.json();
        setList(data);
      } catch (err) {
        console.error("[Pengguna - fetch] Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/pengguna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_pengguna: id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setList((prev) => prev.map((p) => p.id_pengguna === id ? { ...p, status } : p));
    } catch (err) {
      console.error("[Pengguna - updateStatus] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deletePengguna = async (p: Pengguna) => {
    if (!confirm(`Hapus pengguna "${p.nama ?? p.email}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionLoading(p.id_pengguna);
    try {
      const res = await fetch("/api/admin/pengguna", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_pengguna: p.id_pengguna }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setList((prev) => prev.filter((x) => x.id_pengguna !== p.id_pengguna));
    } catch (err) {
      console.error("[Pengguna - delete] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = list.filter((p) => {
    if (p.role === "admin") return false;
    const matchRole = filter === "semua" || p.role === filter;
    const q = search.toLowerCase();
    const matchSearch = p.nama?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const TABS: { key: RoleFilter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "pembeli", label: "Pembeli" },
    { key: "organisasi", label: "Organisasi" },
    { key: "proker", label: "Proker" },
  ];

  const exportHeaders = ["Nama", "Email", "Role", "Status", "Tgl. Daftar"];
  const exportRows = filtered.map((p) => [
    p.nama ?? "—",
    p.email,
    p.role,
    STATUS_LABEL[p.status] ?? p.status ?? "Aktif",
    new Date(p.created_at).toLocaleDateString("id-ID"),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500">Pantau semua akun pengguna platform.</p>
        </div>
        <ExportButton filename="pengguna" title="Data Pengguna" headers={exportHeaders} rows={exportRows} />
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / email..." className="text-sm w-full focus:outline-none" />
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
                  {["Nama", "Email", "Role", "Status", "Tgl. Daftar", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tidak ada pengguna ditemukan.</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id_pengguna} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.nama ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${ROLE_BADGE[p.role] ?? "bg-slate-100 text-slate-600"}`}>{p.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[p.status] ?? p.status ?? "Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setSelected(p)}
                          className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium px-2.5 py-1 rounded-lg transition-colors">
                          Detail
                        </button>
                        {p.status !== "suspended" ? (
                          <button onClick={() => updateStatus(p.id_pengguna, "suspended")} disabled={actionLoading === p.id_pengguna}
                            className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === p.id_pengguna ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Suspend
                          </button>
                        ) : (
                          <button onClick={() => updateStatus(p.id_pengguna, "active")} disabled={actionLoading === p.id_pengguna}
                            className="flex items-center gap-1 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === p.id_pengguna ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Aktifkan
                          </button>
                        )}
                        <button onClick={() => deletePengguna(p)} disabled={actionLoading === p.id_pengguna}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                          {actionLoading === p.id_pengguna ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-slate-900">Detail Pengguna</h2>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Nama", value: selected.nama },
                  { label: "Email", value: selected.email },
                  { label: "Role", value: selected.role },
                  { label: "Status", value: STATUS_LABEL[selected.status] ?? selected.status ?? "Aktif" },
                  { label: "Tgl. Daftar", value: new Date(selected.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) },
                  { label: "ID", value: selected.id_pengguna },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                    <span className="text-xs text-slate-400 shrink-0">{row.label}</span>
                    <span className="text-xs font-medium text-slate-800 text-right break-all">{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
