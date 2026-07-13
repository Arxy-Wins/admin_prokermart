import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE!);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idOrganisasi = searchParams.get("id_organisasi");
    const idSubToko = searchParams.get("id_sub_toko");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const supabase = getClient();
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // resolve which sub_toko ids are in scope when filtering by organisasi/proker
    let subTokoIds: string[] | null = null;
    if (idSubToko) {
      subTokoIds = [idSubToko];
    } else if (idOrganisasi) {
      const { data: tokoRows } = await supabase.from("toko").select("id_toko").eq("id_organisasi", idOrganisasi);
      const tokoIds = (tokoRows ?? []).map((t) => t.id_toko);
      if (tokoIds.length === 0) subTokoIds = [];
      else {
        const { data: subRows } = await supabase.from("sub_toko").select("id_sub_toko").in("id_toko", tokoIds);
        subTokoIds = (subRows ?? []).map((s) => s.id_sub_toko);
      }
    }

    const rangeFrom = dateFrom ? new Date(dateFrom) : sixMonthsAgo;
    const rangeFromISO = dateFrom ? dateFrom : sixMonthsAgo.toISOString();
    const rangeToISO = dateTo ? `${dateTo}T23:59:59` : null;

    let onlineQ = supabase
      .from("pesanan")
      .select("total_harga, tgl_pesan, id_sub_toko")
      .eq("status_pesanan", "selesai")
      .gte("tgl_pesan", rangeFromISO);
    if (rangeToISO) onlineQ = onlineQ.lte("tgl_pesan", rangeToISO);
    if (subTokoIds) onlineQ = onlineQ.in("id_sub_toko", subTokoIds.length ? subTokoIds : ["__none__"]);

    let offlineQ = supabase
      .from("rekap_jualan_offline")
      .select("total_harga, tanggal, id_sub_toko")
      .gte("tanggal", rangeFromISO.slice(0, 10));
    if (rangeToISO) offlineQ = offlineQ.lte("tanggal", dateTo as string);
    if (subTokoIds) offlineQ = offlineQ.in("id_sub_toko", subTokoIds.length ? subTokoIds : ["__none__"]);

    let penarikanQ = supabase
      .from("penarikan_saldo")
      .select("id, jumlah, nama_bank, no_rekening, nama_pemilik, tgl_tarik, id_sub_toko, sub_toko(nama_proker)")
      .order("tgl_tarik", { ascending: false });
    if (dateFrom) penarikanQ = penarikanQ.gte("tgl_tarik", dateFrom);
    if (dateTo) penarikanQ = penarikanQ.lte("tgl_tarik", `${dateTo}T23:59:59`);
    if (subTokoIds) penarikanQ = penarikanQ.in("id_sub_toko", subTokoIds.length ? subTokoIds : ["__none__"]);

    const [onlineRes, offlineRes, penarikanRes] = await Promise.all([onlineQ, offlineQ, penarikanQ]);

    const onlineList = onlineRes.data ?? [];
    const offlineList = offlineRes.data ?? [];
    const penarikanList = penarikanRes.data ?? [];

    const gmvOnline = onlineList.reduce((s: number, o: any) => s + Number(o.total_harga), 0);
    const gmvOffline = offlineList.reduce((s: number, r: any) => s + Number(r.total_harga), 0);
    const totalPenarikan = penarikanList.reduce((s: number, p: any) => s + Number(p.jumlah), 0);

    const bucketStart = new Date(rangeFrom.getFullYear(), rangeFrom.getMonth(), 1);
    const bucketEnd = dateTo ? new Date(dateTo) : now;
    const monthSpan = Math.max(
      1,
      (bucketEnd.getFullYear() - bucketStart.getFullYear()) * 12 + (bucketEnd.getMonth() - bucketStart.getMonth()) + 1
    );
    const buckets: { key: string; label: string; online: number; offline: number }[] = [];
    for (let i = 0; i < Math.min(monthSpan, 12); i++) {
      const d = new Date(bucketStart.getFullYear(), bucketStart.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
      buckets.push({ key, label, online: 0, offline: 0 });
    }
    onlineList.forEach((o: any) => {
      const key = o.tgl_pesan.slice(0, 7);
      const b = buckets.find((b) => b.key === key);
      if (b) b.online += Number(o.total_harga);
    });
    offlineList.forEach((r: any) => {
      const key = r.tanggal.slice(0, 7);
      const b = buckets.find((b) => b.key === key);
      if (b) b.offline += Number(r.total_harga);
    });

    return NextResponse.json({
      gmvOnline,
      gmvOffline,
      totalPenarikan,
      penarikanList,
      monthBuckets: buckets,
    });
  } catch (err) {
    console.error("[Keuangan API - GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
