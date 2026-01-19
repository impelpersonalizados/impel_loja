// KV helpers
export async function kvPutJson(kv, key, value, { ttlSeconds } = {}) {
  const str = JSON.stringify(value);
  if (ttlSeconds) {
    await kv.put(key, str, { expirationTtl: ttlSeconds });
  } else {
    await kv.put(key, str);
  }
}

export async function kvGetJson(kv, key) {
  const str = await kv.get(key);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
