import { withCORS, corsOptionsResponse } from "./cors.js";
import { createPreference } from "./mp.js";
import { handleWebhook } from "./mp.js";
import { checkPaymentStatus } from "./tokens.js";
import { handleDownload } from "./drive.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return corsOptionsResponse(request, env);
    }

    // Rotas
    if (url.pathname === "/api/create_preference" && request.method === "POST") {
      return withCORS(request, env, async () => createPreference(request, env));
    }

    if (url.pathname === "/api/webhook" && request.method === "POST") {
      // Webhook precisa responder rápido. Validamos consultando API do MP.
      // Sem CORS necessário (MP chama servidor-servidor), mas manter OK.
      return withCORS(request, env, async () => handleWebhook(request, env, ctx));
    }

    if (url.pathname === "/api/check" && request.method === "GET") {
      return withCORS(request, env, async () => checkPaymentStatus(request, env));
    }

    if (url.pathname === "/api/download" && request.method === "GET") {
      // Streaming de arquivo: também precisa CORS (caso faça fetch), mas aqui é navegação/redirect.
      return withCORS(request, env, async () => handleDownload(request, env));
    }

    return withCORS(request, env, async () => {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });
  }
};
