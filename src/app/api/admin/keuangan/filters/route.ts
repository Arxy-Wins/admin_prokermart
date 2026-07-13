import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET() {
  try {
    const supabase = getClient();

    const { data: organisasi, error: orgErr } = await supabase
      .from("organisasi")
      .select("id_organisasi, nama_organisasi")
      .order("nama_organisasi");
    if (orgErr) throw orgErr;

    const { data: subToko, error: subErr } = await supabase
      .from("sub_toko")
      .select("id_sub_toko, nama_proker, id_toko, toko(id_organisasi)")
      .order("nama_proker");
    if (subErr) throw subErr;

    return NextResponse.json({
      organisasi: organisasi ?? [],
      subToko: (subToko ?? []).map((s: any) => ({
        id_sub_toko: s.id_sub_toko,
        nama_proker: s.nama_proker,
        id_organisasi: s.toko?.id_organisasi ?? null,
      })),
    });
  } catch (err) {
    console.error("[Keuangan Filters API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
