import { withCORS, corsOptionsResponse } from "./cors.js";

const CONFIG_KEY = "site:config";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function isAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return env.ADMIN_TOKEN && token === env.ADMIN_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return corsOptionsResponse(request, env);

    const url = new URL(request.url);

    // Health check simples
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("OK", { status: 200 });
    }

    // 1) Config pública (para o index.html)
    if (url.pathname === "/api/config" && request.method === "GET") {
      return withCORS(request, env, async () => {
        const raw = await env.SITE_KV.get(CONFIG_KEY);
        return json(raw ? JSON.parse(raw) : null);
      });
    }

    // 2) Salvar config (admin)
    if (url.pathname === "/api/admin/save" && request.method === "POST") {
      return withCORS(request, env, async () => {
        if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") return json({ error: "invalid body" }, 400);

        await env.SITE_KV.put(CONFIG_KEY, JSON.stringify(body));
        return json({ ok: true });
      });
    }

    // 3) Upload imagem (admin) -> R2
    if (url.pathname === "/api/admin/upload" && request.method === "POST") {
      return withCORS(request, env, async () => {
        if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);

        const form = await request.formData();
        const file = form.get("file");
        if (!file) return json({ error: "missing file" }, 400);

        const ext = String(file.name || "img").split(".").pop().toLowerCase();
        const key = `images/${crypto.randomUUID()}.${ext}`;

        await env.SITE_R2.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" }
        });

        // URL pública pelo próprio Worker
        const publicUrl = `${url.origin}/api/public/${key}`;
        return json({ ok: true, key, url: publicUrl });
      });
    }

    // 4) Servir imagens do R2 (público via Worker)
    if (url.pathname.startsWith("/api/public/") && request.method === "GET") {
      const key = url.pathname.replace("/api/public/", "");
      const obj = await env.SITE_R2.get(key);

      if (!obj) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=86400");
      return new Response(obj.body, { status: 200, headers });
    }

    return withCORS(request, env, async () => json({ error: "not found" }, 404));
  }
};
