import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

async function getRequestUserId(req: NextRequest, supabase: ReturnType<typeof getClient>) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

// who is allowed to suspend/delete whom
const CAN_ACT_ON: Record<string, string[]> = {
  ketua: ["ketua", "wakil_ketua", "anggota"],
  wakil_ketua: ["anggota"],
  anggota: [],
};

export async function GET() {
  try {
    const supabase = getClient();

    const { data: admins, error: adminErr } = await supabase
      .from("pengguna")
      .select("id_pengguna, nama, email, status, jabatan, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false });
    if (adminErr) throw adminErr;

    const { data: undangan, error: undanganErr } = await supabase
      .from("undangan_admin")
      .select("id, email, status, jabatan")
      .neq("status", "accepted")
      .order("id", { ascending: false });
    if (undanganErr) throw undanganErr;

    const pending = (undangan ?? []).map((u) => ({
      id_pengguna: null,
      id_undangan: u.id,
      nama: null,
      email: u.email,
      status: "pending",
      jabatan: u.jabatan,
      created_at: null,
    }));

    return NextResponse.json([...pending, ...(admins ?? [])]);
  } catch (err) {
    console.error("[Admins API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id_pengguna, status } = await req.json();
    const supabase = getClient();

    const requesterId = await getRequestUserId(req, supabase);
    if (!requesterId) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    if (requesterId === id_pengguna) {
      return NextResponse.json({ error: "Tidak bisa mengubah status akun sendiri." }, { status: 403 });
    }

    const [{ data: requester }, { data: target }] = await Promise.all([
      supabase.from("pengguna").select("jabatan").eq("id_pengguna", requesterId).single(),
      supabase.from("pengguna").select("jabatan").eq("id_pengguna", id_pengguna).single(),
    ]);

    const allowed = CAN_ACT_ON[requester?.jabatan ?? ""] ?? [];
    if (!allowed.includes(target?.jabatan ?? "")) {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk mengubah admin ini." }, { status: 403 });
    }

    const { error } = await supabase.from("pengguna").update({ status }).eq("id_pengguna", id_pengguna);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admins API - PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id_pengguna, id_undangan } = await req.json();
    const supabase = getClient();

    const requesterId = await getRequestUserId(req, supabase);
    if (!requesterId) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

    const { data: requester } = await supabase.from("pengguna").select("jabatan").eq("id_pengguna", requesterId).single();
    const allowed = CAN_ACT_ON[requester?.jabatan ?? ""] ?? [];

    if (id_undangan) {
      if (!allowed.length) {
        return NextResponse.json({ error: "Anda tidak memiliki izin untuk membatalkan undangan." }, { status: 403 });
      }
      const { error } = await supabase.from("undangan_admin").delete().eq("id", id_undangan);
      if (error) throw error;
    } else {
      if (requesterId === id_pengguna) {
        return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri." }, { status: 403 });
      }
      const { data: target } = await supabase.from("pengguna").select("jabatan").eq("id_pengguna", id_pengguna).single();
      if (!allowed.includes(target?.jabatan ?? "")) {
        return NextResponse.json({ error: "Anda tidak memiliki izin untuk menghapus admin ini." }, { status: 403 });
      }
      const { error } = await supabase.from("pengguna").delete().eq("id_pengguna", id_pengguna);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admins API - DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
