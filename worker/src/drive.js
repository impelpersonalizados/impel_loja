import { getTokenRecord, isExpired, markTokenUsed } from "./tokens.js";

/**
 * Google Drive (Service Account) - Download privado com JWT OAuth2
 * Fluxo:
 * 1) Assinar JWT (RS256) com service account private key
 * 2) Trocar por access_token no endpoint OAuth2
 * 3) Buscar metadata do arquivo (nome)
 * 4) Baixar alt=media e fazer streaming ao cliente
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

function base64UrlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToUint8(str) {
  return new TextEncoder().encode(str);
}

async function importPrivateKey(pem) {
  // Converte PEM -> ArrayBuffer (PKCS8)
  const cleaned = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const raw = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0)).buffer;

  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signJwtRS256(privateKeyPem, header, payload) {
  const key = await importPrivateKey(privateKeyPem);
  const h = base64UrlEncode(textToUint8(JSON.stringify(header)));
  const p = base64UrlEncode(textToUint8(JSON.stringify(payload)));
  const toSign = `${h}.${p}`;

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textToUint8(toSign)
  );

  const s = base64UrlEncode(new Uint8Array(sig));
  return `${toSign}.${s}`;
}

async function getGoogleAccessToken(env) {
  const clientEmail = requireSecret(env, "GDRIVE_CLIENT_EMAIL");
  const privateKey = requireSecret(env, "GDRIVE_PRIVATE_KEY");

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const assertion = await signJwtRS256(privateKey, header, payload);

  const form = new URLSearchParams();
  form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.set("assertion", assertion);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    console.error("Google token error:", data);
    throw new Error("Falha ao obter access_token do Google");
  }

  return data.access_token;
}

async function getDriveFileMetadata(accessToken, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType,size`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("Drive metadata error:", data);
    throw new Error("Falha ao obter metadata do arquivo");
  }
  return data;
}

async function downloadDriveStream(accessToken, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("Drive download error:", text);
    throw new Error("Falha ao baixar arquivo do Drive");
  }
  return resp;
}

export async function handleDownload(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) return json({ error: "token é obrigatório" }, 400);

  const record = await getTokenRecord(env, token);
  if (!record) return json({ error: "Token inválido" }, 401);
  if (isExpired(record.expires_at)) return json({ error: "Token expirado" }, 401);
  if (record.used) return json({ error: "Token já usado" }, 401);

  // Busca arquivo no Drive via Service Account
  const fileId = requireSecret(env, "GDRIVE_FILE_ID");

  const accessToken = await getGoogleAccessToken(env);
  const meta = await getDriveFileMetadata(accessToken, fileId);

  const driveResp = await downloadDriveStream(accessToken, fileId);

  // Marca token como usado (1 download)
  await markTokenUsed(env, token, record);

  const filename = meta?.name || "produto.zip";
  const headers = new Headers(driveResp.headers);

  headers.set("Content-Type", driveResp.headers.get("Content-Type") || "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${sanitizeFilename(filename)}"`);

  // Evita cache
  headers.set("Cache-Control", "no-store");

  return new Response(driveResp.body, { status: 200, headers });
}

function sanitizeFilename(name) {
  return String(name).replace(/[/\\?%*:|"<>]/g, "-");
}
