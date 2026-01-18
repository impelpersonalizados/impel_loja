import { apiFetch } from "./api.js";

export function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function apiCheck(paymentId) {
  return apiFetch(`/api/check?payment_id=${encodeURIComponent(paymentId)}`, {
    method: "GET"
  });
}

function apiDownload(token) {
  // Download via navegação (para receber stream como arquivo)
  // Mantém o token fora do HTML e evita expor link do Drive.
  window.location.href = `${getBaseApiUrl()}/api/download?token=${encodeURIComponent(token)}`;
}

function getBaseApiUrl() {
  // Import dinâmico para evitar circularidade (simples)
  // (Alternativa: importar CONFIG aqui)
  const scripts = document.querySelectorAll('script[type="module"]');
  // fallback
  return (window.__BASE_API_URL || "").trim() || "";
}

// Quando esta página carrega:
(async function initDownloadPage() {
  const token = getQueryParam("token");
  const tokenSpan = document.getElementById("tokenSpan");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("downloadBtn");

  if (!tokenSpan || !btn) return;

  tokenSpan.textContent = token ? token.slice(0, 8) + "..." : "—";

  // Descobre BASE_API_URL via import de config (melhor)
  try {
    const mod = await import("./config.js");
    window.__BASE_API_URL = mod.CONFIG.BASE_API_URL;
  } catch {
    // ignora
  }

  if (!token) {
    msg.textContent = "Token não encontrado. Volte para a página de sucesso e verifique liberação.";
    btn.disabled = true;
    return;
  }

  btn.addEventListener("click", () => {
    msg.textContent = "Iniciando download...";
    apiDownload(token);
  });
})();
