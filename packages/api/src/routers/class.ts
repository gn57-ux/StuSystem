import { classes } from "@student-performance/db/schema/classes";
import { students } from "@student-performance/db/schema/students";
import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../index";

const ClassCreateSchema = z.object({
  name: z.string().min(1).max(100),
  grade: z.string().max(50).optional(),
});

export const classRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: classes.id, name: classes.name, grade: classes.grade, createdAt: classes.createdAt })
      .from(classes)
      .orderBy(classes.name);
  }),

  create: adminProcedure.input(ClassCreateSchema).mutation(async ({ ctx, input }) => {
    const [created] = await ctx.db.insert(classes).values(input).returning();
    return created;
  }),

  update: adminProcedure
    .input(z.object({ id: z.number().int().positive(), data: ClassCreateSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(classes)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(classes.id, input.id))
        .returning();
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const countResult = await ctx.db
        .select({ studentCount: count() })
        .from(students)
        .where(eq(students.classId, input.id));
      const studentCount = countResult[0]?.studentCount ?? 0;

      if (studentCount > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "班级下还有学生，无法删除" });
      }

      await ctx.db.delete(classes).where(eq(classes.id, input.id));
      return { success: true };
    }),
});
