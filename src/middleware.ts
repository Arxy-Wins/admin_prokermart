import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const serviceKey = process.env.SERVICE_SUPABASE!;
  const projectRef = supabaseUrl.split("//")[1].split(".")[0];

  // Supabase v2 may split cookie into chunks: sb-xxx-auth-token.0, .1, etc.
  const cookieKey = `sb-${projectRef}-auth-token`;
  const allCookies = request.cookies.getAll();

  // Collect chunks if split, or single cookie
  const chunks = allCookies
    .filter((c) => c.name === cookieKey || c.name.startsWith(`${cookieKey}.`))
    .sort((a, b) => a.name.localeCompare(b.name));

  const raw = chunks.length > 0
    ? chunks.map((c) => c.value).join("")
    : null;

  let accessToken: string | null = null;
  if (raw) {
    try {
      const value = raw.startsWith("base64-")
        ? Buffer.from(raw.slice(7), "base64").toString("utf-8")
        : decodeURIComponent(raw);
      const parsed = JSON.parse(value);
      accessToken = parsed.access_token ?? null;
    } catch {
      accessToken = null;
    }
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  const { data: { user } } = await supabase.auth.getUser(accessToken);

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: pengguna, error: penggunaError } = await adminClient
    .from("pengguna")
    .select("role")
    .eq("id_pengguna", user.id)
    .single();

  if (!pengguna || pengguna.role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
