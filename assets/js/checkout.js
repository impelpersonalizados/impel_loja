import { CONFIG } from "./config.js";
import { apiFetch } from "./api.js";

/**
 * Cria preferência e redireciona para init_point
 */
export async function startCheckout({ email } = {}) {
  const payload = {
    product: CONFIG.PRODUCT,
    buyer_email: email
  };

  const res = await apiFetch("/api/create_preference", {
    method: "POST",
    body: payload
  });

  if (!res || !res.ok) {
    alert("Erro ao iniciar checkout. Verifique a API e tente novamente.");
    return;
  }

  const data = await res.json();
  if (!data.init_point) {
    alert("Resposta inválida do servidor (sem init_point).");
    return;
  }

  window.location.href = data.init_point;
}

/**
 * Binda botões por IDs para iniciar checkout direto.
 */
export function bindBuyButtons(ids = []) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => startCheckout());
  });
}
