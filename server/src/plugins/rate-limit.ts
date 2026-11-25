import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { ApiError } from "../errors.js";

/** Requests allowed per window for the routes that cost money or can be guessed at. */
type Rule = { match: (request: FastifyRequest) => boolean; limit: number; windowMs: number; name: string };

const MINUTE = 60 * 1000;

const rules: Rule[] = [
  // Sign-in and token refresh: stops guessing and flooding.
  { name: "auth", match: (r) => r.method === "POST" && /^\/auth\/(bank|refresh|bank\/reauth)$/.test(r.routeOptions.url ?? ""), limit: 20, windowMs: MINUTE },
  // Public share links: no sign-in, so limit by address.
  { name: "shared", match: (r) => (r.routeOptions.url ?? "").startsWith("/shared/"), limit: 60, windowMs: MINUTE },
  // Reading vet documents calls the paid Claude API.
  { name: "scan", match: (r) => r.method === "POST" && (r.routeOptions.url ?? "").endsWith("/visits/scan"), limit: 10, windowMs: 60 * MINUTE },
];

/**
 * A simple in-memory fixed-window limit per client address and rule. Enough for one server
 * process; with several instances behind a load balancer, move the counts to a shared store.
 */
export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  const counts = new Map<string, { count: number; resetAt: number }>();

  // Forget finished windows now and then, so the map doesn't grow without end.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of counts) if (entry.resetAt <= now) counts.delete(key);
  }, 5 * MINUTE);
  sweep.unref();
  app.addHook("onClose", async () => clearInterval(sweep));

  app.addHook("onRequest", async (request, reply) => {
    const rule = rules.find((r) => r.match(request));
    if (!rule) return;
    const key = `${rule.name}:${request.ip}`;
    const now = Date.now();
    const entry = counts.get(key);
    if (!entry || entry.resetAt <= now) {
      counts.set(key, { count: 1, resetAt: now + rule.windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > rule.limit) {
      reply.header("retry-after", Math.ceil((entry.resetAt - now) / 1000));
      throw new ApiError(429, "TOO_MANY_REQUESTS", "Too many requests, try again later");
    }
  });
});
