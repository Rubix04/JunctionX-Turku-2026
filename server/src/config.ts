import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_PATH: z.string().default("./data/tassuvahti.db"),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  /**
   * Web addresses allowed to call the API from a browser, comma-separated, e.g.
   * "https://app.tassuvahti.fi". The mobile app doesn't need this. Empty in production = none.
   */
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) => value?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
  /** Public address of the server, used in share links. Defaults to the request's own host. */
  PUBLIC_BASE_URL: z.url().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  // Kept separate from JWT_SECRET: changing it would disconnect every user from their account.
  IDENTITY_HASH_SECRET: z.string().min(32, "IDENTITY_HASH_SECRET must be at least 32 characters"),
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  /** off: no seasonal push job; log: write pushes to the log; expo: really send them */
  PUSH_MODE: z.enum(["off", "log", "expo"]).default("log"),
  /** Optional Expo access token, if push security is enabled in the Expo project */
  EXPO_ACCESS_TOKEN: z.string().optional(),
  /** Claude API key for reading vet documents. Without it, scans return the sample result. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** auto: Claude when ANTHROPIC_API_KEY is set, otherwise the sample; claude or mock to force one */
  VISIT_SCAN_MODE: z.enum(["auto", "claude", "mock"]).default("auto"),
  /** The AI analysis of visits and daily logs; same choices as VISIT_SCAN_MODE */
  INSIGHTS_MODE: z.enum(["auto", "claude", "mock"]).default("auto"),
});

export type Config = z.infer<typeof envSchema>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  // An empty line like "PUBLIC_BASE_URL=" (as in .env.example) means "not set".
  const set = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined && value.trim() !== ""));
  const result = envSchema.safeParse(set);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
  }
  return result.data;
};
