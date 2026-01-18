import { kvGetJson, kvPutJson } from "./storage.js";

const TOKEN_TTL_HOURS = 48; // ajuste se quiser
const TOKEN_TTL_SECONDS = TOKEN_TTL_HOURS * 60 * 60;

function nowIso() {
  return new Date().toISOString();
}

function addHoursIso(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function makeTokenRecord({ token, payment_id, product_id }) {
  return {
    token,
    payment_id,
    product_id,
    used: false,
    created_at: nowIso(),
    expires_at: addHoursIso(TOKEN_TTL_HOURS)
  };
}

export function isExpired(expires_at) {
  return new Date(expires_at).getTime() <= Date.now();
}

export async function saveApprovedToken(env, { payment_id, product_id }) {
  const token = crypto.randomUUID();
  const record = makeTokenRecord({ token, payment_id, product_id });

  // token:<uuid> -> record (com TTL)
  await kvPutJson(env.TOKENS, `token:${token}`, record, { ttlSeconds: TOKEN_TTL_SECONDS });

  // payment:<payment_id> -> token (com TTL)
  await kvPutJson(env.TOKENS, `payment:${payment_id}`, { token, expires_at: record.expires_at }, { ttlSeconds: TOKEN_TTL_SECONDS });

  return record;
}

export async function getTokenByPayment(env, payment_id) {
  const p = await kvGetJson(env.TOKENS, `payment:${payment_id}`);
  if (!p || !p.token) return null;

  const record = await kvGetJson(env.TOKENS, `token:${p.token}`);
  return record || null;
}

export async function getTokenRecord(env, token) {
  return await kvGetJson(env.TOKENS, `token:${token}`);
}

export async function markTokenUsed(env, token, record) {
  const updated = { ...record, used: true, used_at: nowIso() };

  // Regrava sem alterar TTL (KV não mantém TTL automaticamente na atualização),
  // então calculamos TTL restante aproximado:
  const msLeft = new Date(updated.expires_at).getTime() - Date.now();
  const ttl = Math.max(60, Math.floor(msLeft / 1000)); // ao menos 60s

  await kvPutJson(env.TOKENS, `token:${token}`, updated, { ttlSeconds: ttl });
  return updated;
}

export async function checkPaymentStatus(request, env) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id");

  if (!paymentId) {
    return new Response(JSON.stringify({ error: "payment_id é obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const record = await getTokenByPayment(env, paymentId);

  if (!record) {
    return new Response(JSON.stringify({ approved: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (isExpired(record.expires_at)) {
    return new Response(JSON.stringify({ approved: false, expired: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    approved: true,
    token: record.token,
    expires_at: record.expires_at,
    used: record.used
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
