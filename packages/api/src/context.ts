import { auth } from "@student-performance/auth";
import { db } from "@student-performance/db";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});

	return {
		db,
		session,
		user: session?.user ?? null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
