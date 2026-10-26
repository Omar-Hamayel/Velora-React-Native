export function resolveApiBaseUrl(configured: string | undefined, platform: string, development: boolean, allowLocalHttp = false): string {
  const value = configured?.trim() || (development ? (platform === "android" ? "http://10.0.2.2:18081" : "http://127.0.0.1:18081") : "");
  if (!value) throw new Error("EXPO_PUBLIC_API_BASE_URL is required for this build.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("API base URL must be an HTTP(S) origin without credentials, query or fragment.");
  const localHost = ["localhost", "127.0.0.1", "[::1]", "10.0.2.2"].includes(url.hostname);
  if (!development && url.protocol !== "https:" && !(allowLocalHttp && localHost)) throw new Error("Release API URL must use HTTPS. Local HTTP export tests require an explicit loopback-only opt-in.");
  return value.replace(/\/+$/, "");
}
