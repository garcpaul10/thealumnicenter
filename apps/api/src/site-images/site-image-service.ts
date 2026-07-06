import { eq } from "drizzle-orm";
import { siteImages, type Db } from "@alumni/db";

/**
 * Known slot keys the marketing site actually renders. Not enforced at the
 * DB level (slotKey is just a varchar) — this list is what apps/admin's
 * upload UI offers, and what apps/marketing falls back to Picsum for when
 * a slot has no row yet. Sport slots are dynamic (`sport:{slug}`) since
 * sports are admin-managed data, not hardcoded.
 */
export const STATIC_SITE_IMAGE_SLOTS = [
  "hero",
  "about",
  "offering:leagues",
  "offering:camps",
  "offering:openplay",
  "offering:court",
] as const;

export async function listSiteImages(db: Db) {
  return db.select().from(siteImages);
}

/** The only write path for site_images — upserts by slotKey so re-uploading a slot replaces its row rather than accumulating duplicates. */
export async function upsertSiteImage(
  db: Db,
  params: { slotKey: string; imageUrl: string; updatedBy?: string },
) {
  const [existing] = await db.select().from(siteImages).where(eq(siteImages.slotKey, params.slotKey));

  if (existing) {
    const [updated] = await db
      .update(siteImages)
      .set({ imageUrl: params.imageUrl, updatedBy: params.updatedBy ?? null, updatedAt: new Date() })
      .where(eq(siteImages.slotKey, params.slotKey))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(siteImages)
    .values({ slotKey: params.slotKey, imageUrl: params.imageUrl, updatedBy: params.updatedBy ?? null })
    .returning();
  return created;
}
