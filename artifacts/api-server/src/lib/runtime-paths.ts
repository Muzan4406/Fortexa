function normalizePrefix(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export const API_PREFIX = normalizePrefix(
  process.env.FORTEXA_API_PREFIX,
  "/api",
);

export const WEB_PREFIX = normalizePrefix(
  process.env.FORTEXA_WEB_PREFIX,
  "/fortexa",
);

export function withPrefix(prefix: string, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return prefix === "/" ? cleanPath : `${prefix}${cleanPath}`;
}

export function apiPath(path: string): string {
  return withPrefix(API_PREFIX, path);
}

export function webPath(path: string): string {
  return withPrefix(WEB_PREFIX, path);
}