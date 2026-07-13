"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle, XCircle, Trash2, Loader2, Plus, X } from "lucide-react";

type StatusFilter = "semua" | "active" | "inactive" | "suspended" | "pending";

interface Toko {
  id_toko: string | null;
  id_undangan?: string;
  nama_toko: string;
  status: string;
  tgl_dibuat: string | null;
  organisasi: { nama_organisasi: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-red-100 text-red-700",
  suspended: "bg-amber-100 text-amber-700",
  pending: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Suspended",
  pending: "Pending",
};

export default function TokoPage() {
  const [tokoList, setTokoList] = useState<Toko[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("semua");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nama_toko: "", email: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchToko = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/toko");
      if (!res.ok) throw new Error("Failed to fetch toko");
      const data = await res.json();
      setTokoList(data);
    } catch (err) {
      console.error("[Toko - fetch] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToko(); }, [fetchToko]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/toko", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_toko: id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setTokoList((prev) => prev.map((t) => t.id_toko === id ? { ...t, status } : t));
    } catch (err) {
      console.error("[Toko - updateStatus] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteToko = async (t: Toko) => {
    const key = t.id_toko ?? t.id_undangan!;
    if (!confirm(t.status === "pending" ? "Batalkan undangan ini?" : `Hapus toko "${t.nama_toko}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionLoading(key);
    try {
      const res = await fetch("/api/admin/toko", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t.status === "pending" ? { id_undangan: t.id_undangan } : { id_toko: t.id_toko }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setTokoList((prev) => prev.filter((x) => (x.id_toko ?? x.id_undangan) !== key));
    } catch (err) {
      console.error("[Toko - delete] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!form.nama_toko.trim() || !form.email.trim()) { setInviteError("Semua field wajib diisi."); return; }
    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/toko/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim undangan.");
      setInviteSuccess(true);
    } catch (err: any) {
      console.error("[Toko - invite] Error:", err);
      setInviteError(err.message ?? "Terjadi kesalahan.");
    } finally {
      setInviteLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ nama_toko: "", email: "" });
    setInviteError("");
    setInviteSuccess(false);
  };

  const filtered = tokoList.filter((t) => {
    const matchStatus = filter === "semua" || t.status === filter;
    const matchSearch = t.nama_toko.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "pending", label: "Pending" },
    { key: "active", label: "Aktif" },
    { key: "inactive", label: "Nonaktif" },
    { key: "suspended", label: "Suspended" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manajemen Toko</h1>
          <p className="text-sm text-slate-500">Approve, suspend, atau undang toko baru.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Tambah Toko
        </button>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama toko..."
            className="text-sm w-full focus:outline-none" />
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
                  {["Nama Toko", "Organisasi", "Status", "Tgl. Dibuat", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada toko ditemukan.</td></tr>
                ) : filtered.map((t) => {
                  const key = t.id_toko ?? t.id_undangan!;
                  return (
                  <tr key={key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.nama_toko}</td>
                    <td className="px-4 py-3 text-slate-500">{(t.organisasi as any)?.nama_organisasi ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{t.tgl_dibuat ? new Date(t.tgl_dibuat).toLocaleDateString("id-ID") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {t.status === "pending" ? (
                          <button onClick={() => deleteToko(t)} disabled={actionLoading === key}
                            className="flex items-center gap-1 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Batal
                          </button>
                        ) : (
                          <>
                            {t.status === "suspended" ? (
                              <button onClick={() => updateStatus(t.id_toko!, "active")} disabled={actionLoading === key}
                                className="flex items-center gap-1 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                                {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Aktifkan
                              </button>
                            ) : (
                              <button onClick={() => updateStatus(t.id_toko!, "suspended")} disabled={actionLoading === key}
                                className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                                {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Suspend
                              </button>
                            )}
                            <button onClick={() => deleteToko(t)} disabled={actionLoading === key}
                              className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                              {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modal Tambah Toko */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-slate-900 text-lg">Undang Toko Baru</h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-900">Undangan terkirim!</p>
                  <p className="text-sm text-slate-500">Email undangan dikirim ke <strong>{form.email}</strong>. Mereka perlu klik link di email untuk menyelesaikan pendaftaran.</p>
                  <button onClick={closeModal} className="mt-2 bg-blue-600 text-white font-bold px-6 py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors">
                    Tutup
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Toko</label>
                    <input type="text" value={form.nama_toko} onChange={(e) => setForm((f) => ({ ...f, nama_toko: e.target.value }))}
                      placeholder="Contoh: Toko BEM Universitas"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Email Pengelola</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="pengelola@email.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  {inviteError && <p className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>}
                  <p className="text-xs text-slate-400">Email undangan akan dikirim ke alamat di atas. Penerima perlu klik link untuk menyelesaikan pendaftaran toko.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={closeModal}
                      className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition-colors">
                      Batal
                    </button>
                    <button type="submit" disabled={inviteLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      {inviteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Kirim Undangan
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
