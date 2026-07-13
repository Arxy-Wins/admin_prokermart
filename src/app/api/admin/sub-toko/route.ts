import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET() {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("sub_toko")
      .select("id_sub_toko, nama_proker, status, id_toko, toko(nama_toko)")
      .order("id_sub_toko", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[SubToko API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id_sub_toko, status } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("sub_toko").update({ status }).eq("id_sub_toko", id_sub_toko);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[SubToko API - PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id_sub_toko } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("sub_toko").delete().eq("id_sub_toko", id_sub_toko);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[SubToko API - DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
