function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.FRONTEND_ORIGIN || "").trim();

  if (!origin) return null;
  if (allowed && origin === allowed) return origin;

  return null;
}

export function corsOptionsResponse(request, env) {
  const origin = getAllowedOrigin(request, env);
  const headers = new Headers();

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(null, { status: 204, headers });
}

export async function withCORS(request, env, handler) {
  const origin = getAllowedOrigin(request, env);

  try {
    const res = await handler();
    const headers = new Headers(res.headers);

    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }

    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    console.error(err);

    const headers = new Headers({ "Content-Type": "application/json" });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }

    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers });
  }
}
