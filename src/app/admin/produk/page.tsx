"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Trash2, Loader2 } from "lucide-react";

interface Produk {
  id_produk: string;
  nama_produk: string;
  harga: number;
  stok: number;
  status_aktif: boolean;
  sub_toko: { id_sub_toko: string; nama_proker: string } | null;
}

interface SubTokoOption {
  id_sub_toko: string;
  nama_proker: string;
}

export default function ProdukPage() {
  const [list, setList] = useState<Produk[]>([]);
  const [subTokoOptions, setSubTokoOptions] = useState<SubTokoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubToko, setFilterSubToko] = useState("semua");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [produkRes, subTokoRes] = await Promise.all([
          fetch("/api/admin/produk"),
          fetch("/api/admin/sub-toko"),
        ]);
        const produkData = await produkRes.json();
        const subTokoData = await subTokoRes.json();
        setList(Array.isArray(produkData) ? produkData : []);
        setSubTokoOptions(Array.isArray(subTokoData) ? subTokoData.map((s: any) => ({ id_sub_toko: s.id_sub_toko, nama_proker: s.nama_proker })) : []);
      } catch (err) {
        console.error("[Produk - fetch] Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleStatus = async (id: string, currentAktif: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/produk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_produk: id, status_aktif: !currentAktif }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setList((prev) => prev.map((p) => p.id_produk === id ? { ...p, status_aktif: !currentAktif } : p));
    } catch (err) {
      console.error("[Produk - toggleStatus] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteProduk = async (p: Produk) => {
    if (!confirm(`Hapus produk "${p.nama_produk}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionLoading(p.id_produk);
    try {
      const res = await fetch("/api/admin/produk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_produk: p.id_produk }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setList((prev) => prev.filter((x) => x.id_produk !== p.id_produk));
    } catch (err) {
      console.error("[Produk - delete] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = list.filter((p) => {
    const matchSearch = p.nama_produk.toLowerCase().includes(search.toLowerCase());
    const matchSubToko = filterSubToko === "semua" || p.sub_toko?.id_sub_toko === filterSubToko;
    return matchSearch && matchSubToko;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Manajemen Produk</h1>
        <p className="text-sm text-slate-500">Pantau dan kelola semua produk di platform.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className="text-sm w-full focus:outline-none" />
        </div>
        <select
          value={filterSubToko}
          onChange={(e) => setFilterSubToko(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          <option value="semua">Semua Sub-Toko</option>
          {subTokoOptions.map((s) => (
            <option key={s.id_sub_toko} value={s.id_sub_toko}>{s.nama_proker}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Nama Produk", "Sub-Toko", "Harga", "Stok", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">Tidak ada produk ditemukan.</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id_produk} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.nama_produk}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.sub_toko?.nama_proker ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">Rp {Number(p.harga).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-slate-600">{p.stok}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${p.status_aktif ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {p.status_aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(p.id_produk, p.status_aktif)}
                          disabled={actionLoading === p.id_produk}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 ${
                            p.status_aktif
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {actionLoading === p.id_produk && <Loader2 className="w-3 h-3 animate-spin" />}
                          {p.status_aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => deleteProduk(p)}
                          disabled={actionLoading === p.id_produk}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {actionLoading === p.id_produk ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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
