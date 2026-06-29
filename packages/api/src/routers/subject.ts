import { examSubjects } from "@student-performance/db/schema/exam-subjects";
import { subjects } from "@student-performance/db/schema/subjects";
import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../index";

const SubjectCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export const subjectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(subjects).orderBy(subjects.name);
  }),

  create: adminProcedure.input(SubjectCreateSchema).mutation(async ({ ctx, input }) => {
    const [created] = await ctx.db.insert(subjects).values(input).returning();
    return created;
  }),

  update: adminProcedure
    .input(z.object({ id: z.number().int().positive(), data: SubjectCreateSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(subjects)
        .set(input.data)
        .where(eq(subjects.id, input.id))
        .returning();
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const countResult = await ctx.db
        .select({ linkCount: count() })
        .from(examSubjects)
        .where(eq(examSubjects.subjectId, input.id));
      const linkCount = countResult[0]?.linkCount ?? 0;

      if (linkCount > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "科目已关联考试，无法删除" });
      }

      await ctx.db.delete(subjects).where(eq(subjects.id, input.id));
      return { success: true };
    }),
});
