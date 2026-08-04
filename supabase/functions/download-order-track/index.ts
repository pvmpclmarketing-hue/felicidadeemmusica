import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const fail = (message: string, status: number) => new Response(message, { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return fail("Método não permitido.", 405);

  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId") ?? "";
    const index = Number(url.searchParams.get("index"));
    if (!orderId || !Number.isInteger(index) || index < 0 || index > 1) return fail("Download inválido.", 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error } = await supabase.from("orders").select("status,delivery_mode,music_url,music_versions").eq("id", orderId).eq("delivery_mode", "download").single();
    if (error || !order || order.status !== "ready") return fail("Música ainda não liberada.", 403);

    const raw = Array.isArray(order.music_versions) && order.music_versions.length ? order.music_versions : order.music_url ? [order.music_url] : [];
    const tracks = [...new Set(raw.filter((track): track is string => typeof track === "string" && track.startsWith("https://")))].slice(0, 2);
    const trackUrl = tracks[index];
    if (!trackUrl) return fail("Versão não encontrada.", 404);

    const upstream = await fetch(trackUrl);
    if (!upstream.ok || !upstream.body) return fail("Não foi possível obter a música.", 502);

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
        "Content-Disposition": `attachment; filename="felicidade-em-musica-versao-${index + 1}.mp3"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return fail("Não foi possível preparar o download.", 500);
  }
});
