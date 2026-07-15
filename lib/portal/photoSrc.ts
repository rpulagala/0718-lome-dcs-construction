/**
 * Resolve a stored photo `storageKey` to a URL the customer app can render.
 * A remote locator (Vercel Blob / seeded placeholder URL) is used directly; a
 * local key is served through the portal-scoped, ownership-checked
 * /api/portal/files route. Isomorphic — safe to import in client components.
 */
export function portalPhotoSrc(storageKey: string): string {
  return /^https?:\/\//i.test(storageKey) ? storageKey : `/api/portal/files/${storageKey}`;
}
