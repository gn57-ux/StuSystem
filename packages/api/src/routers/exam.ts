import { db as dbInstance } from "@student-performance/db";
import { examClasses } from "@student-performance/db/schema/exam-classes";
import { examSubjects } from "@student-performance/db/schema/exam-subjects";
import { exams } from "@student-performance/db/schema/exams";
import { scores } from "@student-performance/db/schema/scores";
import { classes } from "@student-performance/db/schema/classes";
import { students } from "@student-performance/db/schema/students";
import { subjects } from "@student-performance/db/schema/subjects";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../index";
import { computeAlertsForExam } from "./analytics";

type DbInstance = typeof dbInstance;

async function computeExamRanks(db: DbInstance, examId: number): Promise<void> {
  const scoreRows = await db
    .select({
      id: scores.id,
      studentId: scores.studentId,
      classId: students.classId,
      score: scores.score,
      status: scores.status,
    })
    .from(scores)
    .leftJoin(students, eq(scores.studentId, students.id))
    .where(eq(scores.examId, examId));

  const studentTotals = new Map<number, number>();
  const studentClass = new Map<number, number>();

  for (const row of scoreRows) {
    if (row.classId !== null && row.classId !== undefined) {
      studentClass.set(row.studentId, row.classId);
    }
    if (row.status === "normal" && row.score !== null) {
      const prev = studentTotals.get(row.studentId) ?? 0;
      studentTotals.set(row.studentId, prev + Number.parseFloat(row.score));
    }
  }

  const byClass = new Map<number, { studentId: number; total: number }[]>();
  for (const [studentId, total] of studentTotals) {
    const classId = studentClass.get(studentId);
    if (classId === undefined) continue;
    const group = byClass.get(classId) ?? [];
    group.push({ studentId, total });
    byClass.set(classId, group);
  }

  for (const group of byClass.values()) {
    group.sort((a, b) => b.total - a.total);
    let rank = 1;
    for (let i = 0; i < group.length; i++) {
      const entry = group[i];
      if (!entry) continue;
      if (i > 0 && group[i - 1]?.total !== entry.total) rank = i + 1;
      await db
        .update(scores)
        .set({ rankInClass: rank })
        .where(and(eq(scores.examId, examId), eq(scores.studentId, entry.studentId)));
    }
  }
}

export const examRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.status ? eq(exams.status, input.status) : undefined;
      const examList = await ctx.db
        .select({
          id: exams.id,
          name: exams.name,
          type: exams.type,
          examDate: exams.examDate,
          status: exams.status,
          createdAt: exams.createdAt,
        })
        .from(exams)
        .where(where)
        .orderBy(desc(exams.examDate));

      if (examList.length === 0) return [];

      const examIds = examList.map((e) => e.id);

      const [classRows, subjectRows] = await Promise.all([
        ctx.db
          .select({ examId: examClasses.examId, className: classes.name })
          .from(examClasses)
          .leftJoin(classes, eq(examClasses.classId, classes.id))
          .where(inArray(examClasses.examId, examIds)),
        ctx.db
          .select({ examId: examSubjects.examId })
          .from(examSubjects)
          .where(inArray(examSubjects.examId, examIds)),
      ]);

      const classMap = new Map<number, string[]>();
      for (const row of classRows) {
        const arr = classMap.get(row.examId) ?? [];
        arr.push(row.className ?? "");
        classMap.set(row.examId, arr);
      }

      const subjectCountMap = new Map<number, number>();
      for (const row of subjectRows) {
        subjectCountMap.set(row.examId, (subjectCountMap.get(row.examId) ?? 0) + 1);
      }

      return examList.map((exam) => ({
        ...exam,
        classNames: classMap.get(exam.id) ?? [],
        subjectCount: subjectCountMap.get(exam.id) ?? 0,
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [exam] = await ctx.db
        .select()
        .from(exams)
        .where(eq(exams.id, input.id));
      if (!exam) {
        throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
      }

      const [examClassRows, examSubjectRows] = await Promise.all([
        ctx.db
          .select({ classId: examClasses.classId, className: classes.name })
          .from(examClasses)
          .leftJoin(classes, eq(examClasses.classId, classes.id))
          .where(eq(examClasses.examId, input.id)),
        ctx.db
          .select({
            subjectId: examSubjects.subjectId,
            subjectName: subjects.name,
            fullScore: examSubjects.fullScore,
          })
          .from(examSubjects)
          .leftJoin(subjects, eq(examSubjects.subjectId, subjects.id))
          .where(eq(examSubjects.examId, input.id)),
      ]);

      return {
        ...exam,
        classes: examClassRows,
        subjects: examSubjectRows,
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: z.string().min(1).max(50),
        examDate: z.string().min(1),
        classIds: z.array(z.number().int().positive()).min(1),
        subjects: z
          .array(
            z.object({
              subjectId: z.number().int().positive(),
              fullScore: z.number().int().min(1).max(1000),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const [exam] = await tx
          .insert(exams)
          .values({
            name: input.name,
            type: input.type,
            examDate: input.examDate,
            status: "draft",
          })
          .returning();
        if (!exam) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await tx.insert(examClasses).values(
          input.classIds.map((classId) => ({ examId: exam.id, classId }))
        );

        await tx.insert(examSubjects).values(
          input.subjects.map((s) => ({
            examId: exam.id,
            subjectId: s.subjectId,
            fullScore: s.fullScore,
          }))
        );

        return exam;
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: z.object({
          name: z.string().min(1).max(200),
          examDate: z.string().min(1),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [exam] = await ctx.db
        .select({ id: exams.id, status: exams.status })
        .from(exams)
        .where(eq(exams.id, input.id));
      if (!exam) {
        throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
      }
      if (exam.status === "published") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "已发布的考试不允许修改",
        });
      }

      const [updated] = await ctx.db
        .update(exams)
        .set({ name: input.data.name, examDate: input.data.examDate })
        .where(eq(exams.id, input.id))
        .returning();
      return updated;
    }),

  publish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [exam] = await ctx.db
        .select({ id: exams.id, status: exams.status })
        .from(exams)
        .where(eq(exams.id, input.id));
      if (!exam) {
        throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
      }
      if (exam.status === "published") {
        throw new TRPCError({ code: "CONFLICT", message: "考试已经发布" });
      }

      await ctx.db
        .update(exams)
        .set({ status: "published" })
        .where(eq(exams.id, input.id));

      await computeExamRanks(ctx.db, input.id);
      await computeAlertsForExam(ctx.db, input.id);

      return { success: true };
    }),
});
