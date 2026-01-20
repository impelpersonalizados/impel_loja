// ADMIN ONLINE (sem import)
// Base API do seu Worker:
const BASE_API_URL = "https://impel-api.impelpersonalizados.workers.dev";

const DEFAULT_CONFIG = {
  title: "Produto",
  code: "",
  pixPrice: "0,00",
  cardPrice: "",
  installments: 1,
  installmentValue: "",
  payments: { pix: true, card: true, boleto: false },
  importantLines: [],
  descriptionText: "",
  options: [],
  images: [],
  header: { logoUrl: "", align: "center", bg: "white" },
  footer: {
    whatsapp: "(74) 99964-1627",
    instagram: "@impelpersonalizados",
    email: "impelpersonalizados@gmail.com"
  }
};

function $(id){ return document.getElementById(id); }

async function apiGetConfig(){
  const res = await fetch(`${BASE_API_URL}/api/config`);
  if(!res.ok) return null;
  return await res.json();
}

async function apiSaveConfig(token, cfg){
  return await fetch(`${BASE_API_URL}/api/admin/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(cfg)
  });
}

async function apiUpload(token, file){
  const fd = new FormData();
  fd.append("file", file, file.name);

  const res = await fetch(`${BASE_API_URL}/api/admin/upload`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: fd
  });

  if(!res.ok) throw new Error("upload failed");
  return await res.json(); // { ok, url, key }
}

function setMsg(text){ $("msg").textContent = text; }

function fillForm(cfg){
  $("title").value = cfg.title || "";
  $("code").value = cfg.code || "";
  $("pixPrice").value = cfg.pixPrice || "";
  $("cardPrice").value = cfg.cardPrice || "";
  $("installments").value = cfg.installments || 1;
  $("installmentValue").value = cfg.installmentValue || "";

  $("importantLines").value = (cfg.importantLines || []).join("\n");
  $("descriptionText").value = cfg.descriptionText || "";

  $("payPix").checked = !!cfg.payments?.pix;
  $("payCard").checked = !!cfg.payments?.card;
  $("payBoleto").checked = !!cfg.payments?.boleto;

  $("logoAlign").value = cfg.header?.align || "center";
  $("topBg").value = cfg.header?.bg || "white";
  $("logoUrl").value = cfg.header?.logoUrl || "";

  // Mostrar lista de imagens já enviadas (opcional)
  const box = $("imagesList");
  if (box) {
    const imgs = cfg.images || [];
    box.innerHTML = imgs.length
      ? imgs.map((u) => `<div style="word-break:break-all;margin:6px 0;">${u}</div>`).join("")
      : "<span style='color:#6b6b76'>Nenhuma imagem enviada ainda.</span>";
  }
}

function readForm(cfg){
  cfg.title = $("title").value.trim();
  cfg.code = $("code").value.trim();
  cfg.pixPrice = $("pixPrice").value.trim();
  cfg.cardPrice = $("cardPrice").value.trim();
  cfg.installments = Number($("installments").value || 1);
  cfg.installmentValue = $("installmentValue").value.trim();

  cfg.importantLines = $("importantLines").value.split("\n").map(s=>s.trim()).filter(Boolean);
  cfg.descriptionText = $("descriptionText").value;

  cfg.payments = {
    pix: $("payPix").checked,
    card: $("payCard").checked,
    boleto: $("payBoleto").checked
  };

  cfg.header = cfg.header || {};
  cfg.header.align = $("logoAlign").value;
  cfg.header.bg = $("topBg").value;
  cfg.header.logoUrl = $("logoUrl").value.trim();
  cfg.product = cfg.product || {};
  cfg.product.fileKey = "produtos/produto.zip";
  cfg.product.filename = "produto.zip";

  // ✅ Arquivo do produto no R2 (OBRIGATÓRIO para /api/download funcionar)
cfg.product = cfg.product || {};
cfg.product.fileKey = "produtos/produto.zip"; // <-- troque se seu arquivo tiver outro nome
cfg.product.filename = "produto.zip";         // <-- nome que o cliente vai baixar

  return cfg;
}

window.addEventListener("DOMContentLoaded", async () => {
  let cfg = await apiGetConfig();
  if(!cfg) cfg = structuredClone(DEFAULT_CONFIG);

  fillForm(cfg);
  setMsg("Config carregada do servidor ✅");

  $("logoFile").addEventListener("change", async (e) => {
    const token = $("adminToken").value.trim();
    const file = e.target.files?.[0];
    if(!token) return setMsg("Coloque o ADMIN TOKEN antes de enviar a logo.");
    if(!file) return;

    setMsg("Enviando logo...");
    try {
      const up = await apiUpload(token, file);
      $("logoUrl").value = up.url;
      setMsg("Logo enviada ✅ Agora clique em SALVAR.");
    } catch {
      setMsg("Erro ao enviar logo ❌");
    }
    $("logoFile").value = "";
  });

  $("imgsFile").addEventListener("change", async (e) => {
    const token = $("adminToken").value.trim();
    const files = Array.from(e.target.files || []);
    if(!token) return setMsg("Coloque o ADMIN TOKEN antes de enviar imagens.");
    if(!files.length) return;

    setMsg("Enviando imagens...");
    try {
      cfg = readForm(cfg);
      cfg.images = cfg.images || [];

      for (const f of files) {
        const up = await apiUpload(token, f);
        cfg.images.push(up.url);
      }

      fillForm(cfg);
      setMsg("Imagens enviadas ✅ Agora clique em SALVAR.");
    } catch {
      setMsg("Erro ao enviar imagens ❌");
    }
    $("imgsFile").value = "";
  });

  $("btnSave").addEventListener("click", async () => {
    const token = $("adminToken").value.trim();
    if(!token) return setMsg("Coloque o ADMIN TOKEN antes de salvar.");

    cfg = readForm(cfg);

    setMsg("Salvando no servidor...");
    try {
      const res = await apiSaveConfig(token, cfg);
      if(res.ok) {
        setMsg("Salvo ONLINE ✅ Agora qualquer dispositivo verá.");
      } else if (res.status === 401) {
        setMsg("Erro 401: ADMIN TOKEN errado ❌");
      } else {
        setMsg("Falha ao salvar ❌");
      }
    } catch {
      setMsg("Falha de rede/CORS ❌ (veja console F12)");
    }
  });
});
