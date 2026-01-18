const STORAGE_KEY = "site_product_config_v1";

export function loadSiteConfig(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
