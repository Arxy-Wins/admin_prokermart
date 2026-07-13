import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token tidak valid." }, { status: 400 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("undangan_admin")
      .select("email, status")
      .eq("token", token)
      .single();

    if (error || !data) return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    if (data.status === "accepted") return NextResponse.json({ error: "Undangan sudah digunakan." }, { status: 410 });

    return NextResponse.json({ email: data.email });
  } catch (err) {
    console.error("[DaftarAdmin - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, nama } = await req.json();
    if (!token || !nama?.trim()) {
      return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: inv, error: invErr } = await supabase
      .from("undangan_admin")
      .select("id, email, status, jabatan")
      .eq("token", token)
      .single();

    if (invErr || !inv) return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    if (inv.status === "accepted") return NextResponse.json({ error: "Undangan sudah digunakan." }, { status: 410 });

    const { data: usersData } = await supabase.auth.admin.listUsers();
    const authUser = usersData?.users?.find((u) => u.email === inv.email);
    if (!authUser) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

    const { error: penggunaErr } = await supabase.from("pengguna").upsert({
      id_pengguna: authUser.id,
      nama: nama.trim(),
      email: inv.email,
      password: "",
      role: "admin",
      jabatan: inv.jabatan ?? "anggota",
      status: "active",
    }, { onConflict: "id_pengguna" });
    if (penggunaErr) throw penggunaErr;

    await supabase.from("undangan_admin").update({ status: "accepted" }).eq("id", inv.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[DaftarAdmin - POST] Error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}
