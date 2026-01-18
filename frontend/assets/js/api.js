import { CONFIG } from "./config.js";

export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const url = `${CONFIG.BASE_API_URL}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {})
    }
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  try {
    return await fetch(url, opts);
  } catch (err) {
    console.error("apiFetch error:", err);
    return new Response(null, { status: 0, statusText: "Network error" });
  }
}

/**
 * Client-side includes:
 * - qualquer elemento com [data-include="..."] será preenchido com o HTML do arquivo
 */
export async function loadPartials() {
  const nodes = document.querySelectorAll("[data-include]");
  await Promise.all([...nodes].map(async (node) => {
    const file = node.getAttribute("data-include");
    try {
      const res = await fetch(file, { cache: "no-cache" });
      node.innerHTML = await res.text();
    } catch (e) {
      node.innerHTML = `<div class="card">Erro ao carregar componente: ${file}</div>`;
    }
  }));
}
