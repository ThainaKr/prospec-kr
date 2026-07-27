import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// A interface agora é hospedada no GitHub Pages. Este endpoint antigo
// permanece bloqueado para não ser confundido com o endereço de produção.
Deno.serve(() => new Response("Endpoint desativado", { status: 410 }));
