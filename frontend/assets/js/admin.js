const STORAGE_KEY = "site_product_config_v1";

const DEFAULT_CONFIG = {
  title: "Quadro de mesa personalizado com foto (2 lados, frente e verso) 15x20cm",
  code: "QM15200001",
  pixPrice: "129,00",
  cardPrice: "143,33",
  installments: 3,
  installmentValue: "47,77",
  payments: { pix: true, card: true, boleto: false },

  importantLines: [
    "Prazo de produção: até 10 dias úteis",
    "Tem urgência? Chame no WhatsApp antes de comprar"
  ],
  descriptionText: "Escreva aqui a descrição completa do produto...",

  images: [],
  options: [
    { id: "opt-1", label: "Cor da borda", values: ["branca","madeira","preta"], default: "branca" }
  ],

  header: {
    logoDataUrl: "",
    align: "center",
    bg: "white"
  },

  // ✅ Rodapé
  footer: {
    title: "© 2026 – Impel Personalizados | Todos os direitos reservados",
    line1: "Produto digital. Nenhum item físico será enviado.",
    line2: "Os arquivos vendidos são protegidos por direitos autorais. É permitida a produção e venda do produto físico. É proibida a revenda, compartilhamento ou doação do arquivo digital.",
    line3: "Por se tratar de produto digital com download imediato, não realizamos trocas ou reembolsos após o acesso ao conteúdo.",
    whatsapp: "(74) 99964-1627",
    instagram: "@impelpersonalizados",
    email: "impelpersonalizados@gmail.com"
  }
};

function $(id){ return document.getElementById(id); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

function esc(str){
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function uid(){
  return "opt-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function loadConfig(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return clone(DEFAULT_CONFIG);

    const parsed = JSON.parse(raw);
    const merged = { ...clone(DEFAULT_CONFIG), ...parsed };

    merged.payments = { ...clone(DEFAULT_CONFIG.payments), ...(parsed.payments || {}) };

    if (!Array.isArray(merged.options)) merged.options = [];
    merged.options = merged.options
      .filter(o => o && typeof o === "object")
      .map(o => ({
        id: o.id || uid(),
        label: (o.label || "Opção").trim(),
        values: Array.isArray(o.values) ? o.values.filter(Boolean).map(v => String(v).trim()) : [],
        default: (o.default || "").trim()
      }))
      .map(o => {
        if (!o.values.length) o.values = ["opção 1","opção 2"];
        if (!o.default || !o.values.includes(o.default)) o.default = o.values[0];
        return o;
      });

    merged.header = { ...clone(DEFAULT_CONFIG.header), ...(parsed.header || {}) };
    if (!["center","left"].includes(merged.header.align)) merged.header.align = "center";
    if (!["white","purple"].includes(merged.header.bg)) merged.header.bg = "white";

    merged.footer = { ...clone(DEFAULT_CONFIG.footer), ...(parsed.footer || {}) };

    if (!Array.isArray(merged.importantLines)) merged.importantLines = [];
    if (typeof merged.descriptionText !== "string") merged.descriptionText = "";

    return merged;
  } catch {
    return clone(DEFAULT_CONFIG);
  }
}

function saveConfig(cfg){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function resetConfig(){
  localStorage.removeItem(STORAGE_KEY);
  return clone(DEFAULT_CONFIG);
}

function moneyBRL(str){
  const s = String(str || "").trim().replace(".", ",");
  if(!s) return "";
  return `R$ ${s}`;
}

async function fileToDataUrl(file){
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function filesToDataUrls(fileList){
  const files = Array.from(fileList || []);
  const out = [];
  for(const f of files){
    out.push(await fileToDataUrl(f));
  }
  return out;
}

/* ===== Preview ===== */
function renderPreview(cfg){
  $("pvTitle").textContent = cfg.title || "—";
  $("pvCode").textContent = cfg.code ? `(Cód: ${cfg.code})` : "—";

  const pay = [];
  if(cfg.payments?.pix) pay.push("Pix");
  if(cfg.payments?.card) pay.push("Cartão");
  if(cfg.payments?.boleto) pay.push("Boleto");
  $("pvPay").innerHTML = pay.length
    ? pay.map(p => `<span class="tag">${esc(p)}</span>`).join(" ")
    : `<span class="muted small">Nenhum tipo selecionado</span>`;

  $("pvPix").textContent = cfg.pixPrice ? `${moneyBRL(cfg.pixPrice)} no pix` : "—";
  $("pvCard").textContent =
    (cfg.cardPrice && cfg.installments && cfg.installmentValue)
      ? `${moneyBRL(cfg.cardPrice)} em até ${cfg.installments}x de ${moneyBRL(cfg.installmentValue)} sem juros`
      : "—";

  // important preview
  const ulImp = $("pvImportant");
  ulImp.innerHTML = "";
  (cfg.importantLines || []).forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    ulImp.appendChild(li);
  });

  // desc preview
  $("pvDescText").textContent = cfg.descriptionText?.trim()
    ? cfg.descriptionText.trim().slice(0, 180) + (cfg.descriptionText.length > 180 ? "..." : "")
    : "(Sem descrição)";

  // opções preview
  const pvOpt = $("pvOptions");
  if (Array.isArray(cfg.options) && cfg.options.length) {
    pvOpt.innerHTML = cfg.options.map(o =>
      `<div><b>${esc(o.label)}:</b> [${esc(o.values.join(", "))}] • padrão: ${esc(o.default)}</div>`
    ).join("");
  } else {
    pvOpt.innerHTML = `<span class="muted small">(sem opções)</span>`;
  }

  // imagens preview
  const pv = $("pvImgs");
  pv.innerHTML = "";
  const imgs = (cfg.images && cfg.images.length) ? cfg.images : ["../assets/img/hero.png"];
  imgs.slice(0,4).forEach(src => {
    const wrap = document.createElement("div");
    wrap.className = "img-card";
    wrap.innerHTML = `<img src="${src}" alt="img"/>`;
    pv.appendChild(wrap);
  });

  // logo preview
  const logoImg = $("logoPreview");
  const logoEmpty = $("logoPreviewEmpty");
  if (logoImg && logoEmpty) {
    if (cfg.header?.logoDataUrl) {
      logoImg.src = cfg.header.logoDataUrl;
      logoImg.style.display = "block";
      logoEmpty.style.display = "none";
    } else {
      logoImg.style.display = "none";
      logoEmpty.style.display = "block";
    }
  }
}

/* ===== Imagens ===== */
function renderImageGrid(cfg){
  const grid = $("imgGrid");
  grid.innerHTML = "";

  const imgs = cfg.images || [];
  if(!imgs.length){
    grid.innerHTML = `<div class="muted small" style="margin-top:10px;">Sem imagens enviadas.</div>`;
    return;
  }

  imgs.forEach((src, idx) => {
    const card = document.createElement("div");
    card.className = "img-card";
    card.innerHTML = `
      <img src="${src}" alt="img-${idx}">
      <div class="actions">
        <button class="btn" data-del="${idx}">Remover</button>
        <button class="btn" data-main="${idx}">Colocar 1ª</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.onclick = (e) => {
    const t = e.target;
    if(!t) return;

    const del = t.getAttribute("data-del");
    const main = t.getAttribute("data-main");

    if(del !== null){
      cfg.images.splice(Number(del), 1);
      saveConfig(cfg);
      renderImageGrid(cfg);
      renderPreview(cfg);
      return;
    }

    if(main !== null){
      const i = Number(main);
      const item = cfg.images[i];
      cfg.images.splice(i, 1);
      cfg.images.unshift(item);
      saveConfig(cfg);
      renderImageGrid(cfg);
      renderPreview(cfg);
      return;
    }
  };
}

/* ===== Options editor ===== */
function renderOptionsEditor(cfg){
  const wrap = $("optionsList");
  wrap.innerHTML = "";

  if (!cfg.options.length) {
    wrap.innerHTML = `<div class="muted small">Nenhuma opção cadastrada. Clique em <b>+ Adicionar opção</b>.</div>`;
    return;
  }

  cfg.options.forEach((opt, idx) => {
    const div = document.createElement("div");
    div.className = "opt-card";
    div.dataset.optId = opt.id;

    div.innerHTML = `
      <div class="opt-header">
        <strong>Opção ${idx + 1}</strong>
        <button class="btn btn-danger mini" data-remove="${esc(opt.id)}">Remover opção</button>
      </div>

      <div class="two">
        <div class="field">
          <label>Nome da opção</label>
          <input type="text" data-field="label" value="${esc(opt.label)}" />
        </div>

        <div class="field">
          <label>Valor padrão</label>
          <input type="text" data-field="default" value="${esc(opt.default)}" />
        </div>
      </div>

      <div class="field">
        <label>Valores (1 por linha)</label>
        <textarea data-field="values">${esc(opt.values.join("\n"))}</textarea>
      </div>
    `;

    wrap.appendChild(div);
  });

  wrap.onclick = (e) => {
    const btn = e.target;
    const id = btn?.getAttribute?.("data-remove");
    if (!id) return;

    cfg.options = cfg.options.filter(o => o.id !== id);
    saveConfig(cfg);
    renderOptionsEditor(cfg);
    renderPreview(cfg);
    $("msg").textContent = "Opção removida ✅";
  };

  wrap.oninput = (e) => {
    const el = e.target;
    const card = el.closest(".opt-card");
    if (!card) return;

    const optId = card.dataset.optId;
    const opt = cfg.options.find(o => o.id === optId);
    if (!opt) return;

    const field = el.getAttribute("data-field");
    if (!field) return;

    if (field === "label") opt.label = el.value.trim() || "Opção";
    if (field === "default") opt.default = el.value.trim();

    if (field === "values") {
      const vals = el.value.split("\n").map(s => s.trim()).filter(Boolean);
      opt.values = vals.length ? vals : ["opção 1","opção 2"];
    }

    if (!opt.default || !opt.values.includes(opt.default)) opt.default = opt.values[0];
    renderPreview(cfg);
  };
}

function addOption(cfg){
  cfg.options.push({
    id: uid(),
    label: "Nova opção",
    values: ["opção 1", "opção 2"],
    default: "opção 1"
  });
  saveConfig(cfg);
}

/* ===== Fill / Read ===== */
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

  // footer
  $("footerTitle").value = cfg.footer?.title || "";
  $("footerLine1").value = cfg.footer?.line1 || "";
  $("footerLine2").value = cfg.footer?.line2 || "";
  $("footerLine3").value = cfg.footer?.line3 || "";
  $("footerWhatsapp").value = cfg.footer?.whatsapp || "";
  $("footerInstagram").value = cfg.footer?.instagram || "";
  $("footerEmail").value = cfg.footer?.email || "";
}

function readForm(cfg){
  cfg.title = $("title").value.trim();
  cfg.code = $("code").value.trim();
  cfg.pixPrice = $("pixPrice").value.trim();
  cfg.cardPrice = $("cardPrice").value.trim();
  cfg.installments = Number($("installments").value || 1);
  cfg.installmentValue = $("installmentValue").value.trim();

  cfg.importantLines = $("importantLines").value.split("\n").map(s => s.trim()).filter(Boolean);
  cfg.descriptionText = $("descriptionText").value;

  cfg.payments = {
    pix: $("payPix").checked,
    card: $("payCard").checked,
    boleto: $("payBoleto").checked
  };

  cfg.header = cfg.header || {};
  cfg.header.align = $("logoAlign").value;
  cfg.header.bg = $("topBg").value;

  cfg.footer = cfg.footer || {};
  cfg.footer.title = $("footerTitle").value.trim();
  cfg.footer.line1 = $("footerLine1").value.trim();
  cfg.footer.line2 = $("footerLine2").value.trim();
  cfg.footer.line3 = $("footerLine3").value.trim();
  cfg.footer.whatsapp = $("footerWhatsapp").value.trim();
  cfg.footer.instagram = $("footerInstagram").value.trim();
  cfg.footer.email = $("footerEmail").value.trim();

  return cfg;
}

/* ===== Init ===== */
(function init(){
  const debug = $("debug");
  if (debug) {
    debug.innerHTML = `<b>URL:</b> ${esc(location.href)}<br><b>Storage:</b> ${esc(STORAGE_KEY)}`;
  }

  let cfg = loadConfig();
  fillForm(cfg);
  renderOptionsEditor(cfg);
  renderPreview(cfg);
  renderImageGrid(cfg);

  [
    "title","code","pixPrice","cardPrice","installments","installmentValue",
    "importantLines","descriptionText",
    "payPix","payCard","payBoleto",
    "logoAlign","topBg",
    "footerTitle","footerLine1","footerLine2","footerLine3","footerWhatsapp","footerInstagram","footerEmail"
  ].forEach(id => {
    $(id)?.addEventListener("input", () => { cfg = readForm(cfg); renderPreview(cfg); });
    $(id)?.addEventListener("change", () => { cfg = readForm(cfg); renderPreview(cfg); });
  });

  $("btnAddOption")?.addEventListener("click", () => {
    cfg = readForm(cfg);
    addOption(cfg);
    renderOptionsEditor(cfg);
    renderPreview(cfg);
    $("msg").textContent = "Opção adicionada ✅";
  });

  $("logoInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    $("msg").textContent = "Carregando logo...";
    cfg.header.logoDataUrl = await fileToDataUrl(f);
    saveConfig(cfg);
    renderPreview(cfg);
    $("msg").textContent = "Logo salva ✅";
    $("logoInput").value = "";
  });

  $("btnRemoveLogo")?.addEventListener("click", () => {
    cfg.header.logoDataUrl = "";
    saveConfig(cfg);
    renderPreview(cfg);
    $("msg").textContent = "Logo removida ✅";
  });

  $("imgInput")?.addEventListener("change", async (e) => {
    const files = e.target.files;
    if(!files || !files.length) return;

    $("msg").textContent = "Carregando imagens...";
    const dataUrls = await filesToDataUrls(files);

    cfg.images = [...(cfg.images || []), ...dataUrls].slice(0, 12);
    saveConfig(cfg);

    renderImageGrid(cfg);
    renderPreview(cfg);

    $("msg").textContent = "Imagens adicionadas ✅";
    $("imgInput").value = "";
  });

  $("btnSave")?.addEventListener("click", () => {
    cfg = readForm(cfg);

    cfg.options = (cfg.options || []).map(o => {
      o.label = (o.label || "Opção").trim();
      o.values = Array.isArray(o.values) ? o.values.map(v => String(v).trim()).filter(Boolean) : [];
      if (!o.values.length) o.values = ["opção 1","opção 2"];
      if (!o.default || !o.values.includes(o.default)) o.default = o.values[0];
      return o;
    });

    saveConfig(cfg);
    renderOptionsEditor(cfg);
    renderPreview(cfg);
    $("msg").textContent = "Tudo salvo ✅";
  });

  $("btnReset")?.addEventListener("click", () => {
    cfg = resetConfig();
    fillForm(cfg);
    renderOptionsEditor(cfg);
    renderPreview(cfg);
    renderImageGrid(cfg);
    $("msg").textContent = "Resetado ✅";
  });
})();
