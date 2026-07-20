import { revalidateTag } from "next/cache";

export const catalogCacheTag = "catalog";

export function invalidateCatalogCache() {
  revalidateTag(catalogCacheTag, { expire: 0 });
}
