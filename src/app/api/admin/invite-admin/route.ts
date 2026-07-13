import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

const ASSIGNABLE_BY: Record<string, string[]> = {
  ketua: ["wakil_ketua", "anggota"],
  wakil_ketua: ["anggota"],
};

export async function POST(req: NextRequest) {
  try {
    const { email, jabatan } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    if (!jabatan?.trim()) return NextResponse.json({ error: "Jabatan wajib dipilih." }, { status: 400 });

    const supabase = getServiceClient();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

    const { data: requester } = await supabase
      .from("pengguna")
      .select("jabatan")
      .eq("id_pengguna", userData.user.id)
      .single();

    const allowedTargets = ASSIGNABLE_BY[requester?.jabatan ?? ""];
    if (!allowedTargets) {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk mengundang admin." }, { status: 403 });
    }
    if (!allowedTargets.includes(jabatan)) {
      return NextResponse.json({ error: "Anda tidak dapat memberikan jabatan tersebut." }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from("undangan_admin")
      .select("id, status")
      .eq("email", email.trim())
      .single();

    if (existing?.status === "accepted") {
      return NextResponse.json({ error: "Email sudah terdaftar sebagai admin." }, { status: 409 });
    }

    let inviteToken: string;

    if (existing) {
      const { data: updated, error: updateErr } = await supabase
        .from("undangan_admin")
        .update({ status: "pending", jabatan })
        .eq("id", existing.id)
        .select("token")
        .single();
      if (updateErr) throw updateErr;
      inviteToken = updated.token;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("undangan_admin")
        .insert({ email: email.trim(), jabatan })
        .select("token")
        .single();
      if (insertErr) throw insertErr;
      inviteToken = inserted.token;
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/daftar-admin?token=${inviteToken}`;

    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email.trim(), { redirectTo });
    if (inviteErr) throw inviteErr;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[InviteAdmin - POST] Error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}
