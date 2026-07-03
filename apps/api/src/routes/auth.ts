import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { staffUsers } from "@alumni/db";
import { verifyPassword } from "../auth/password.js";
import { signStaffToken } from "../auth/jwt.js";
import { requireStaffAuth } from "../auth/middleware.js";

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { phone: string; password: string } }>("/auth/login", async (request, reply) => {
    const { phone, password } = request.body ?? {};
    if (!phone || !password) {
      return reply.code(400).send({ error: "phone and password are required" });
    }

    const [staffUser] = await app.db.select().from(staffUsers).where(eq(staffUsers.phone, phone));
    if (!staffUser || !staffUser.passwordHash) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, staffUser.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = await signStaffToken({ staffUserId: staffUser.id, role: staffUser.role });
    return reply.send({
      token,
      staffUser: { id: staffUser.id, name: staffUser.name, role: staffUser.role },
    });
  });

  app.get("/auth/me", { preHandler: requireStaffAuth }, async (request, reply) => {
    const [staffUser] = await app.db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, request.staff!.staffUserId));
    if (!staffUser) {
      return reply.code(404).send({ error: "Staff user not found" });
    }
    return reply.send({ id: staffUser.id, name: staffUser.name, role: staffUser.role });
  });
}
