import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET() {
  try {
    const supabase = getClient();
    const { data: toko, error: tokoErr } = await supabase
      .from("toko")
      .select("id_toko, nama_toko, status, tgl_dibuat, organisasi(nama_organisasi)")
      .order("tgl_dibuat", { ascending: false });
    if (tokoErr) throw tokoErr;

    const { data: undangan, error: undanganErr } = await supabase
      .from("undangan_toko")
      .select("id, nama_toko, email, status")
      .neq("status", "accepted")
      .order("id", { ascending: false });
    if (undanganErr) throw undanganErr;

    const pending = (undangan ?? []).map((u) => ({
      id_undangan: u.id,
      nama_toko: u.nama_toko,
      email: u.email,
      status: "pending",
      tgl_dibuat: null,
      organisasi: null,
    }));

    return NextResponse.json([...pending, ...(toko ?? [])]);
  } catch (err) {
    console.error("[Toko API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id_toko, status } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("toko").update({ status }).eq("id_toko", id_toko);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Toko API - PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id_toko, id_undangan } = await req.json();
    const supabase = getClient();
    if (id_undangan) {
      const { error } = await supabase.from("undangan_toko").delete().eq("id", id_undangan);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("toko").delete().eq("id_toko", id_toko);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Toko API - DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
