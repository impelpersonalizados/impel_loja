import { saveApprovedToken, getTokenByPayment } from "./tokens.js";

/**
 * Mercado Pago endpoints (REST)
 * - Criar preferência: POST https://api.mercadopago.com/checkout/preferences
 * - Consultar pagamento: GET https://api.mercadopago.com/v1/payments/{payment_id}
 */

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function requireSecret(env, name) {
  const v = env[name];
  if (!v) throw new Error(`Missing secret: ${name}`);
  return v;
}

export async function createPreference(request, env) {
  const accessToken = requireSecret(env, "MP_ACCESS_TOKEN");

  const body = await request.json().catch(() => null);
  if (!body || !body.product) {
    return json({ error: "Body inválido. Esperado { product: {id,title,price}, buyer_email? }" }, 400);
  }

  const product = body.product;
  const buyerEmail = body.buyer_email;

  if (!product.id || !product.title || typeof product.price !== "number") {
    return json({ error: "Produto inválido. Esperado {id,title,price:number}" }, 400);
  }

  const backBase = (env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");
  const apiBase = (env.API_BASE_URL || "").replace(/\/+$/, "");

  if (!backBase || !apiBase) {
    return json({ error: "Config inválida no Worker. Defina FRONTEND_BASE_URL e API_BASE_URL em wrangler.toml" }, 500);
  }

  const preferencePayload = {
    items: [
      {
        id: product.id,
        title: product.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: product.price
      }
    ],
    back_urls: {
      success: `${backBase}/pages/success.html`,
      pending: `${backBase}/pages/pending.html`,
      failure: `${backBase}/pages/failure.html`
    },
    notification_url: `${apiBase}/api/webhook`,
    auto_return: "approved",
    metadata: {
      product_id: product.id,
      buyer_email: buyerEmail || ""
    }
  };

  const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(preferencePayload)
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    console.error("MP create preference error:", data);
    return json({ error: "Falha ao criar preferência", details: data }, 502);
  }

  // init_point para produção; sandbox_init_point existe em alguns contextos
  return json({ init_point: data.init_point || data.sandbox_init_point }, 200);
}

/**
 * Webhook: sempre confirmar o pagamento via API (não confiar só no webhook).
 * MP costuma enviar algo como:
 * - { "type": "payment", "data": { "id": "123" } }
 * OU params na query.
 */
export async function handleWebhook(request, env, ctx) {
  const accessToken = requireSecret(env, "MP_ACCESS_TOKEN");

  const url = new URL(request.url);
  const queryId = url.searchParams.get("data.id") || url.searchParams.get("id");

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    // pode vir sem body
  }

  const paymentId =
    queryId ||
    payload?.data?.id ||
    payload?.id ||
    payload?.resource?.split?.("/").pop?.();

  if (!paymentId) {
    // Responder 200 para não ficar re-tentando sem necessidade
    return json({ ok: true, note: "Webhook recebido sem payment id" }, 200);
  }

  // confirm via MP API
  const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` }
  });

  const paymentData = await payment.json().catch(() => ({}));
  if (!payment.ok) {
    console.error("MP payment fetch error:", paymentData);
    // Retorna 200 para não gerar looping; você pode retornar 500 se preferir retentativas
    return json({ ok: true, note: "Falha ao confirmar pagamento" }, 200);
  }

  const status = paymentData.status;
  const productId =
    paymentData?.metadata?.product_id ||
    paymentData?.additional_info?.items?.[0]?.id ||
    "produto-01";

  if (status === "approved") {
    // Evita gerar token duplicado:
    const existing = await getTokenByPayment(env, String(paymentId));
    if (existing && existing.token) {
      return json({ ok: true, approved: true, token: existing.token, duplicated: true }, 200);
    }

    const record = await saveApprovedToken(env, {
      payment_id: String(paymentId),
      product_id: String(productId)
    });

    return json({ ok: true, approved: true, token: record.token }, 200);
  }

  return json({ ok: true, approved: false, status }, 200);
}
