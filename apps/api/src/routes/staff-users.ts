import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { staffUsers } from "@alumni/db";
import { requireAdminAuth } from "../auth/middleware.js";
import { hashPassword } from "../auth/password.js";

export async function staffUsersRoutes(app: FastifyInstance) {
  app.get("/staff-users", { preHandler: requireAdminAuth }, async () => {
    const rows = await app.db.select().from(staffUsers);
    return rows.map(({ passwordHash: _passwordHash, kioskPinHash: _kioskPinHash, ...rest }) => rest);
  });

  app.post<{ Body: { name: string; phone: string; password: string; role?: "admin" | "staff" } }>(
    "/staff-users",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { name, phone, password, role } = request.body;
      if (!name || !phone || !password) {
        return reply.code(400).send({ error: "name, phone, and password are required" });
      }
      const passwordHash = await hashPassword(password);
      const [staffUser] = await app.db
        .insert(staffUsers)
        .values({ name, phone, passwordHash, role: role ?? "staff" })
        .returning();
      return reply.code(201).send({ id: staffUser.id, name: staffUser.name, role: staffUser.role });
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<{ name: string; role: "admin" | "staff"; password: string }> }>(
    "/staff-users/:id",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { password, ...rest } = request.body;
      const update: Record<string, unknown> = { ...rest };
      if (password) update.passwordHash = await hashPassword(password);

      const [staffUser] = await app.db
        .update(staffUsers)
        .set(update)
        .where(eq(staffUsers.id, request.params.id))
        .returning();
      if (!staffUser) return reply.code(404).send({ error: "Staff user not found" });
      return { id: staffUser.id, name: staffUser.name, role: staffUser.role };
    },
  );
}
