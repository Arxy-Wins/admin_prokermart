import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("produk")
      .select("id_produk, nama_produk, harga, stok, status_aktif, sub_toko(id_sub_toko, nama_proker)")
      .order("nama_produk");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[Produk API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id_produk, status_aktif } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("produk").update({ status_aktif }).eq("id_produk", id_produk);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Produk API - PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id_produk } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("produk").delete().eq("id_produk", id_produk);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Produk API - DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
