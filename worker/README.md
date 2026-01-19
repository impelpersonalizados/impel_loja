# Worker (Cloudflare Workers + KV)

## Requisitos
- Node.js instalado
- Conta Cloudflare
- Wrangler instalado:
  npm i -g wrangler

## 1) Entrar e criar o projeto
cd worker
wrangler login

## 2) Criar KV (free)
wrangler kv:namespace create "TOKENS_KV"
wrangler kv:namespace create "TOKENS_KV" --preview

Copie os IDs retornados e cole no `wrangler.toml` (binding = TOKENS).

## 3) Configurar secrets
Mercado Pago:
wrangler secret put MP_ACCESS_TOKEN

Google Drive (Service Account):
wrangler secret put GDRIVE_CLIENT_EMAIL
wrangler secret put GDRIVE_PRIVATE_KEY
wrangler secret put GDRIVE_FILE_ID

IMPORTANTE: ao colar a PRIVATE_KEY, mantenha as quebras de linha.
Se vier com "\n", cole como texto com quebras reais, ou mantenha "\n" e o código converte.

## 4) Configurar vars (wrangler.toml)
- FRONTEND_ORIGIN (seu domínio do GitHub Pages, para CORS)
- FRONTEND_BASE_URL (url base do GitHub Pages)
- API_BASE_URL (url do worker publicado)

## 5) Deploy
wrangler deploy

## 6) Webhook Mercado Pago
No Mercado Pago, configure:
notification_url = {API_BASE_URL}/api/webhook
O Worker também envia isso ao criar preferências.

## 7) Teste
- Abra o site do GitHub Pages
- Clique comprar, pague (sandbox se preferir)
- success.html -> "Verificar liberação"
- download.html -> baixar
