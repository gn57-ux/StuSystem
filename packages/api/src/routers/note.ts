import { user } from "@student-performance/db/schema/auth";
import { teacherNotes } from "@student-performance/db/schema/teacher-notes";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const noteRouter = router({
	list: protectedProcedure
		.input(z.object({ studentId: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					authorName: user.name,
					content: teacherNotes.content,
					createdAt: teacherNotes.createdAt,
					id: teacherNotes.id,
					studentId: teacherNotes.studentId,
				})
				.from(teacherNotes)
				.leftJoin(user, eq(teacherNotes.authorId, user.id))
				.where(eq(teacherNotes.studentId, input.studentId))
				.orderBy(desc(teacherNotes.createdAt));

			return rows;
		}),

	create: protectedProcedure
		.input(
			z.object({
				content: z.string().min(1).max(2000),
				studentId: z.number().int().positive(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			const [note] = await ctx.db
				.insert(teacherNotes)
				.values({
					authorId: ctx.user.id,
					content: input.content,
					studentId: input.studentId,
				})
				.returning();

			return note;
		}),
});
