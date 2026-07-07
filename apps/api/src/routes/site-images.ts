import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { put } from "@vercel/blob";
import { requireStaffAuth } from "../auth/middleware.js";
import { listSiteImages, upsertSiteImage, STATIC_SITE_IMAGE_SLOTS } from "../site-images/site-image-service.js";
import { sports } from "@alumni/db";
import { env } from "../env.js";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB — modern phone camera photos (especially HEIC/ProRAW) routinely land in the 8-15MB range; 8MB was rejecting real, unremarkable photos

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

      // toBuffer() throws FST_REQ_FILE_TOO_LARGE (a Fastify error, not a
      // plain Error) once the stream hits the multipart plugin's fileSize
      // limit above — caught here so the client gets a clean, expected JSON
      // error instead of an unhandled exception surfacing as a generic 500.
      let buffer: Buffer;
      try {
        buffer = await file.toBuffer();
      } catch (err) {
        if ((err as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
          return reply.code(413).send({ error: `Image is too large — max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` });
        }
        throw err;
      }

      // Slot keys like "sport:basketball" contain a colon — safe as a DB
      // value, but Vercel Blob URL-encodes colons in the object path, which
      // then round-trips through Next's image proxy oddly (double-encoded
      // %253A). Swapped for a hyphen here purely for a cleaner Blob URL;
      // has no bearing on the actual slotKey stored in site_images.
      const blobSafeSlotKey = slotKey.replace(/:/g, "-");
      const blob = await put(`site-images/${blobSafeSlotKey}-${Date.now()}`, buffer, {
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
