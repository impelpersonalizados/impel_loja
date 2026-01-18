// Ajuste estas configs após publicar:
//
// BASE_API_URL:
// - URL do seu Cloudflare Worker (ex: https://minha-api.meuworker.workers.dev)
//
// FRONTEND_ORIGIN:
// - Seu domínio do GitHub Pages (ex: https://seuusuario.github.io)
// - É usado no CORS do Worker (recomendado)

export const CONFIG = {
  BASE_API_URL: "https://SEU-WORKER.SUBDOMAIN.workers.dev",
  FRONTEND_ORIGIN: "https://SEUUSUARIO.github.io",

  // Produto (exemplo). Você pode editar o título/preço/id
  PRODUCT: {
    id: "produto-01",
    title: "Produto Digital",
    price: 29.90
  }
};
