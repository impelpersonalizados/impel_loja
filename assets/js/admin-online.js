import { CONFIG } from "./config.js";

const API_UPLOAD = "/api/admin/upload";
const API_SAVE   = "/api/admin/save";
const API_GET    = "/api/config";

let productImages = [];

function $(id){ return document.getElementById(id); }

function setMsg(text, ok = true){
  const el = $("msg");
  if(!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#0a7a2f" : "#b00020";
}

async function fetchJSON(path, options = {}){
  const res = await fetch(CONFIG.BASE_API_URL + path, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || data?.detail || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function authHeaders(){
  const token = ($("adminToken")?.value || "").trim();
  if(!token) return null;
  return { "Authorization": `Bearer ${token}` };
}

/* ---------- Imagens (render + remover + principal) ---------- */
function renderImages(){
  const list = $("imagesList");
  if(!list) return;

  list.innerHTML = "";

  if(!productImages.length){
    list.innerHTML = `<div class="muted">Nenhuma imagem adicionada ainda.</div>`;
    return;
  }

  productImages.forEach((url, index) => {
    const div = document.createElement("div");
    div.className = "image-item";

    const isMain = index === 0;

    div.innerHTML = `
      <img src="${url}" alt="Imagem ${index + 1}">
      <div class="meta">
        ${isMain ? `<div class="badge">PRINCIPAL</div>` : ``}
        <div class="url">${url}</div>
      </div>
      <div class="img-actions">
        <button type="button" class="btn-mini set-main">Definir como principal</button>
        <button type="button" class="btn-mini btn-danger remove">Remover</button>
      </div>
    `;

    div.querySelector(".remove").onclick = () => {
      if (confirm("Remover esta imagem da lista?")) {
        productImages.splice(index, 1);
        renderImages();
      }
    };

    div.querySelector(".set-main").onclick = () => {
      if (index === 0) return;
      const item = productImages[index];
      productImages.splice(index, 1);
      productImages.unshift(item);
      renderImages();
    };

    list.appendChild(div);
  });
}

/* ---------- Upload ---------- */
async function uploadFile(file){
  const headers = authHeaders();
  if(!headers) throw new Error("Cole o ADMIN TOKEN primeiro.");

  const fd = new FormData();
  fd.append("file", file, file.name);

  const data = await fetchJSON(API_UPLOAD, {
    method: "POST",
    headers,
    body: fd
  });

  if(!data?.url) throw new Error("Upload não retornou 'url'.");
  return data.url;
}

/* ---------- Form ---------- */
function fillForm(cfg){
  cfg = cfg && typeof cfg === "object" ? cfg : {};

  $("title").value = cfg.title || "";
  $("code").value = cfg.code || "";

  $("pixPrice").value = cfg.pixPrice || "";
  $("cardPrice").value = cfg.cardPrice || "";

  $("installments").value = cfg.installments ?? 1;
  $("installmentValue").value = cfg.installmentValue || "";

  $("importantLines").value = (cfg.importantLines || []).join("\n");
  $("descriptionText").value = cfg.descriptionText || "";

  $("payPix").checked = !!cfg.payments?.pix;
  $("payCard").checked = !!cfg.payments?.card;
  $("payBoleto").checked = !!cfg.payments?.boleto;

  $("logoUrl").value = cfg.header?.logoUrl || "";
  $("logoAlign").value = cfg.header?.align || "center";
  $("topBg").value = cfg.header?.bg || "white";

  productImages = Array.isArray(cfg.images) ? cfg.images.slice() : [];
  renderImages();
}

function collectForm(cfg){
  cfg = cfg && typeof cfg === "object" ? cfg : {};

  const important = ($("importantLines")?.value || "")
    .split("\n").map(s => s.trim()).filter(Boolean);

  cfg.title = $("title")?.value?.trim() || "";
  cfg.code = $("code")?.value?.trim() || "";

  cfg.pixPrice = $("pixPrice")?.value?.trim() || "";
  cfg.cardPrice = $("cardPrice")?.value?.trim() || "";

  cfg.installments = Number($("installments")?.value || 1);
  cfg.installmentValue = $("installmentValue")?.value?.trim() || "";

  cfg.importantLines = important;
  cfg.descriptionText = $("descriptionText")?.value || "";

  cfg.payments = {
    pix: !!$("payPix")?.checked,
    card: !!$("payCard")?.checked,
    boleto: !!$("payBoleto")?.checked
  };

  cfg.header = cfg.header || {};
  cfg.header.logoUrl = $("logoUrl")?.value?.trim() || "";
  cfg.header.align = $("logoAlign")?.value || "center";
  cfg.header.bg = $("topBg")?.value || "white";

  cfg.images = productImages.slice();

  // Produto do R2 (ajuste se seu nome for diferente)
  cfg.product = cfg.product || {};
  cfg.product.id = cfg.product.id || "cofre_5000_laser";
  cfg.product.title = cfg.product.title || cfg.title || "Produto";
  cfg.product.fileKey = cfg.product.fileKey || "produtos/caixa-cofre-5000.zip";
  cfg.product.filename = cfg.product.filename || "caixa-cofre-5000.zip";

  return cfg;
}

/* ---------- Load + Events ---------- */
async function loadConfig(){
  const cfg = await fetchJSON(API_GET, { method: "GET" });
  return cfg || {};
}

document.addEventListener("DOMContentLoaded", async () => {
  renderImages();

  // carregar config atual
  try {
    setMsg("Carregando configurações...", true);
    window.__cfg = await loadConfig();
    fillForm(window.__cfg);
    setMsg("Config carregada ✅", true);
  } catch (err) {
    window.__cfg = {};
    setMsg("Não foi possível carregar config: " + err.message, false);
  }

  // upload logo
  $("logoFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;

    try {
      setMsg("Enviando logo...", true);
      const url = await uploadFile(file);
      $("logoUrl").value = url;
      setMsg("Logo enviada ✅", true);
    } catch (err) {
      setMsg("Erro no upload da logo: " + err.message, false);
    } finally {
      e.target.value = "";
    }
  });

  // upload imagens
  $("imgsFile")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if(!files.length) return;

    try {
      setMsg(`Enviando ${files.length} imagem(ns)...`, true);
      for (const file of files) {
        const url = await uploadFile(file);
        productImages.push(url);
      }
      renderImages();
      setMsg("Imagens enviadas ✅ (lembre de salvar)", true);
    } catch (err) {
      setMsg("Erro no upload das imagens: " + err.message, false);
    } finally {
      e.target.value = "";
    }
  });

  // salvar
  $("btnSave")?.addEventListener("click", async () => {
    const headers = authHeaders();
    if(!headers) return setMsg("Cole o ADMIN TOKEN.", false);

    try {
      setMsg("Salvando no servidor...", true);

      const cfg = collectForm(window.__cfg);

      const data = await fetchJSON(API_SAVE, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cfg)
      });

      window.__cfg = cfg;
      setMsg(data?.ok ? "Salvo com sucesso ✅" : "Salvo ✅", true);
    } catch (err) {
      setMsg("Erro ao salvar: " + err.message, false);
    }
  });
});
