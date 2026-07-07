import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SERVICE_SUPABASE!,
  );
}

// Mengambil daftar organisasi
export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("organisasi")
      .select("id_organisasi, nama_organisasi, status_verifikasi, tgl_daftar")
      .order("tgl_daftar", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[Organisasi API - GET] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Memperbarui status verifikasi organisasi (Approve/Reject)
export async function PATCH(req: NextRequest) {
  try {
    const { id_organisasi, status_verifikasi } = await req.json();
    const supabase = getClient();

    const { error } = await supabase
      .from("organisasi")
      .update({ status_verifikasi })
      .eq("id_organisasi", id_organisasi);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Organisasi API - PATCH] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
