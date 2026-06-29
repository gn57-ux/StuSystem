import { createDb } from "@student-performance/db";
import * as schema from "@student-performance/db/schema/auth";
import { env } from "@student-performance/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
	const db = createDb();
	const isHttps = env.BETTER_AUTH_URL.startsWith("https://");

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					defaultValue: "teacher",
					required: false,
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: isHttps ? "none" : "lax",
				secure: isHttps,
				httpOnly: true,
			},
		},
		plugins: [],
	});
}

export const auth = createAuth();
