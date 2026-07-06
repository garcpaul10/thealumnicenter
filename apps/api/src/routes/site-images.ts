import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { put } from "@vercel/blob";
import { requireStaffAuth } from "../auth/middleware.js";
import { listSiteImages, upsertSiteImage, STATIC_SITE_IMAGE_SLOTS } from "../site-images/site-image-service.js";
import { sports } from "@alumni/db";
import { env } from "../env.js";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — generous for a compressed photo, small enough to reject accidental huge uploads

/**
 * Staff-facing image management for apps/marketing's photo slots (hero,
 * per-sport banners, offering cards, about page). Files go to Vercel Blob
 * (public, no auth needed to read — same trust level as any other asset
 * apps/marketing serves); this route is the only thing that writes to
 * `site_images`, mirroring the ledger's single-write-path convention.
 */
export async function siteImagesRoutes(app: FastifyInstance) {
  await app.register(async (scoped) => {
    await scoped.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES } });

    scoped.get("/site-images", { preHandler: requireStaffAuth }, async () => {
      const rows = await listSiteImages(scoped.db);
      const bySlot = new Map(rows.map((row) => [row.slotKey, row]));
      const sportRows = await scoped.db.select().from(sports);

      const knownSlots = [
        ...STATIC_SITE_IMAGE_SLOTS,
        ...sportRows.map((sport) => `sport:${sport.slug}`),
      ];

      return knownSlots.map((slotKey) => ({
        slotKey,
        imageUrl: bySlot.get(slotKey)?.imageUrl ?? null,
        updatedAt: bySlot.get(slotKey)?.updatedAt ?? null,
      }));
    });

    scoped.post("/site-images/:slotKey", { preHandler: requireStaffAuth }, async (request, reply) => {
      const { slotKey } = request.params as { slotKey: string };
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded" });
      if (!file.mimetype.startsWith("image/")) {
        return reply.code(400).send({ error: "Only image uploads are allowed" });
      }

      const buffer = await file.toBuffer();
      const blob = await put(`site-images/${slotKey}-${Date.now()}`, buffer, {
        access: "public",
        contentType: file.mimetype,
        token: env.blobReadWriteToken,
      });

      const row = await upsertSiteImage(scoped.db, {
        slotKey,
        imageUrl: blob.url,
        updatedBy: request.staff!.staffUserId,
      });
      return reply.code(201).send(row);
    });
  });
}
