"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, UserPlus, X, Users, Mail, XCircle, CheckCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AdminUser = {
  id_pengguna: string | null;
  id_undangan?: string;
  nama: string | null;
  email: string;
  status: string;
  jabatan: string;
  created_at: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  pending: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  suspended: "Nonaktif",
  pending: "Pending",
};

const JABATAN_BADGE: Record<string, string> = {
  ketua: "bg-violet-100 text-violet-700",
  wakil_ketua: "bg-indigo-100 text-indigo-700",
  anggota: "bg-slate-100 text-slate-600",
};

const JABATAN_LABEL: Record<string, string> = {
  ketua: "Ketua",
  wakil_ketua: "Wakil Ketua",
  anggota: "Anggota",
};

// who is allowed to suspend/delete whom (mirrors backend rule)
const CAN_ACT_ON: Record<string, string[]> = {
  ketua: ["ketua", "wakil_ketua", "anggota"],
  wakil_ketua: ["anggota"],
  anggota: [],
};

// jabatan a requester may assign when inviting
const ASSIGNABLE_BY: Record<string, string[]> = {
  ketua: ["wakil_ketua", "anggota"],
  wakil_ketua: ["anggota"],
  anggota: [],
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function PengaturanPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserJabatan, setCurrentUserJabatan] = useState<string | null>(null);
  const [inviteJabatan, setInviteJabatan] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.id) return;
      setCurrentUserId(data.user.id);
      const { data: pengguna } = await supabase.from("pengguna").select("jabatan").eq("id_pengguna", data.user.id).single();
      setCurrentUserJabatan(pengguna?.jabatan ?? null);
    });
  }, []);

  async function fetchAdmins() {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) throw new Error("Gagal memuat data admin.");
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      console.error("[Pengaturan - fetchAdmins] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAdmins(); }, []);

  const assignableJabatan = ASSIGNABLE_BY[currentUserJabatan ?? ""] ?? [];
  const canInvite = assignableJabatan.length > 0;
  const canActOn = (targetJabatan: string) => (CAN_ACT_ON[currentUserJabatan ?? ""] ?? []).includes(targetJabatan);

  const authHeaders = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const updateStatus = async (id: string, status: string) => {
    if (id === currentUserId) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ id_pengguna: id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setAdmins((prev) => prev.map((a) => a.id_pengguna === id ? { ...a, status } : a));
    } catch (err) {
      console.error("[Pengaturan - updateStatus] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteAdmin = async (a: AdminUser) => {
    if (a.id_pengguna && a.id_pengguna === currentUserId) return;
    const key = a.id_pengguna ?? a.id_undangan!;
    if (!confirm(a.status === "pending" ? "Batalkan undangan ini?" : `Hapus admin "${a.nama ?? a.email}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionLoading(key);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: await authHeaders(),
        body: JSON.stringify(a.status === "pending" ? { id_undangan: a.id_undangan } : { id_pengguna: a.id_pengguna }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setAdmins((prev) => prev.filter((x) => (x.id_pengguna ?? x.id_undangan) !== key));
    } catch (err) {
      console.error("[Pengaturan - delete] Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!inviteJabatan) { setInviteError("Jabatan wajib dipilih."); return; }
    setInviting(true);
    try {
      const res = await fetch("/api/admin/invite-admin", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ email: inviteEmail, jabatan: inviteJabatan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim undangan.");
      setInviteSuccess(true);
      setInviteEmail("");
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setInviteEmail("");
    setInviteJabatan("");
    setInviteError("");
    setInviteSuccess(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500 mt-0.5">Kelola akun admin platform</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-sm">Daftar Admin</h3>
          </div>
          {canInvite && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Undang Admin
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Belum ada admin terdaftar.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {admins.map((admin) => {
              const key = admin.id_pengguna ?? admin.id_undangan!;
              return (
              <div key={key} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-bold text-sm">
                    {admin.nama?.charAt(0)?.toUpperCase() ?? admin.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{admin.nama ?? "—"}</p>
                  <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${JABATAN_BADGE[admin.jabatan] ?? "bg-slate-100 text-slate-600"}`}>
                  {JABATAN_LABEL[admin.jabatan] ?? admin.jabatan}
                </span>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_BADGE[admin.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABEL[admin.status] ?? admin.status}
                </span>
                <p className="text-xs text-slate-400 shrink-0 w-28">{admin.created_at ? formatDate(admin.created_at) : "—"}</p>
                <div className="flex gap-2 shrink-0">
                  {admin.id_pengguna && admin.id_pengguna === currentUserId ? (
                    <span className="text-xs text-slate-400 italic px-2.5 py-1">Ini akun Anda</span>
                  ) : !canActOn(admin.jabatan) ? (
                    <span className="text-xs text-slate-300 italic px-2.5 py-1">Tidak ada akses</span>
                  ) : admin.status === "pending" ? (
                    <button onClick={() => deleteAdmin(admin)} disabled={actionLoading === key}
                      className="flex items-center gap-1 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                      {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      Batal
                    </button>
                  ) : (
                    <>
                      {admin.status === "suspended" ? (
                        <button onClick={() => updateStatus(admin.id_pengguna!, "active")} disabled={actionLoading === key}
                          className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                          {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Unsuspend
                        </button>
                      ) : (
                        <button onClick={() => updateStatus(admin.id_pengguna!, "suspended")} disabled={actionLoading === key}
                          className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                          {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Suspend
                        </button>
                      )}
                      <button onClick={() => deleteAdmin(admin)} disabled={actionLoading === key}
                        className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                        {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-900 text-sm">Undang Admin</h3>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="text-center space-y-3">
                  <p className="text-emerald-600 font-bold text-sm">Undangan berhasil dikirim!</p>
                  <p className="text-xs text-slate-500">Link undangan telah dikirim ke email yang dituju.</p>
                  <button onClick={closeModal}
                    className="mt-2 text-sm font-bold text-blue-600 hover:underline">
                    Tutup
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Email Admin Baru</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="email@contoh.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Jabatan</label>
                    <select
                      value={inviteJabatan}
                      onChange={(e) => setInviteJabatan(e.target.value)}
                      required
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      <option value="" disabled>Pilih jabatan</option>
                      {assignableJabatan.map((j) => (
                        <option key={j} value={j}>{JABATAN_LABEL[j] ?? j}</option>
                      ))}
                    </select>
                  </div>
                  {inviteError && (
                    <p className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={closeModal}
                      className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                      Batal
                    </button>
                    <button type="submit" disabled={inviting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
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
