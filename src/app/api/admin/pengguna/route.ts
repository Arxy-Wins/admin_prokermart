import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  try {
    const supabase = getClient();
    let query = supabase
      .from("pengguna")
      .select("id_pengguna, nama, email, role, status, created_at")
      .order("created_at", { ascending: false });
    if (role) query = query.eq("role", role);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[Pengguna API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id_pengguna, status } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("pengguna").update({ status }).eq("id_pengguna", id_pengguna);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Pengguna API - PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id_pengguna } = await req.json();
    const supabase = getClient();
    const { error } = await supabase.from("pengguna").delete().eq("id_pengguna", id_pengguna);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Pengguna API - DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
