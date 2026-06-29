import { examSubjects } from "@student-performance/db/schema/exam-subjects";
import { exams } from "@student-performance/db/schema/exams";
import { scores } from "@student-performance/db/schema/scores";
import { students } from "@student-performance/db/schema/students";
import { subjects } from "@student-performance/db/schema/subjects";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const ScoreStatusSchema = z.enum(["normal", "absent", "exempt", "pending"]);

export const scoreRouter = router({
  listByExamClass: protectedProcedure
    .input(
      z.object({
        examId: z.number().int().positive(),
        classId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [exam] = await ctx.db
        .select({ id: exams.id, status: exams.status })
        .from(exams)
        .where(eq(exams.id, input.examId));
      if (!exam) {
        throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
      }

      const [studentRows, subjectRows, scoreRows] = await Promise.all([
        ctx.db
          .select({
            id: students.id,
            name: students.name,
            studentNo: students.studentNo,
          })
          .from(students)
          .where(and(eq(students.classId, input.classId), eq(students.status, "active")))
          .orderBy(students.studentNo),
        ctx.db
          .select({
            subjectId: examSubjects.subjectId,
            subjectName: subjects.name,
            fullScore: examSubjects.fullScore,
          })
          .from(examSubjects)
          .leftJoin(subjects, eq(examSubjects.subjectId, subjects.id))
          .where(eq(examSubjects.examId, input.examId)),
        ctx.db
          .select({
            id: scores.id,
            studentId: scores.studentId,
            subjectId: scores.subjectId,
            score: scores.score,
            status: scores.status,
            rankInClass: scores.rankInClass,
          })
          .from(scores)
          .where(
            and(
              eq(scores.examId, input.examId),
              inArray(
                scores.studentId,
                ctx.db
                  .select({ id: students.id })
                  .from(students)
                  .where(eq(students.classId, input.classId))
              )
            )
          ),
      ]);

      return {
        examStatus: exam.status,
        students: studentRows,
        subjects: subjectRows,
        scores: scoreRows,
      };
    }),

  batchUpsert: protectedProcedure
    .input(
      z.object({
        examId: z.number().int().positive(),
        scores: z.array(
          z.object({
            studentId: z.number().int().positive(),
            subjectId: z.number().int().positive(),
            score: z.string().nullable(),
            status: ScoreStatusSchema,
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [exam] = await ctx.db
        .select({ id: exams.id, status: exams.status })
        .from(exams)
        .where(eq(exams.id, input.examId));
      if (!exam) {
        throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
      }
      if (exam.status === "published") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "已发布的考试不允许修改成绩",
        });
      }

      const subjectMap = new Map<number, number>();
      const subjectRows = await ctx.db
        .select({ subjectId: examSubjects.subjectId, fullScore: examSubjects.fullScore })
        .from(examSubjects)
        .where(eq(examSubjects.examId, input.examId));
      for (const row of subjectRows) {
        subjectMap.set(row.subjectId, row.fullScore);
      }

      for (const item of input.scores) {
        const fullScore = subjectMap.get(item.subjectId) ?? 100;
        await ctx.db
          .insert(scores)
          .values({
            examId: input.examId,
            studentId: item.studentId,
            subjectId: item.subjectId,
            score: item.score,
            fullScore,
            status: item.status,
          })
          .onConflictDoUpdate({
            target: [scores.studentId, scores.examId, scores.subjectId],
            set: { score: item.score, status: item.status },
          });
      }

      return { success: true, count: input.scores.length };
    }),

  csvImport: protectedProcedure
    .input(
      z.object({
        examId: z.number().int().positive(),
        classId: z.number().int().positive(),
        rows: z.array(
          z.object({
            studentNo: z.string(),
            subjectName: z.string(),
            score: z.string(),
            status: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [exam] = await ctx.db
        .select({ id: exams.id, status: exams.status })
        .from(exams)
        .where(eq(exams.id, input.examId));
      if (!exam) {
        throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
      }
      if (exam.status === "published") {
        throw new TRPCError({ code: "CONFLICT", message: "已发布的考试不允许修改成绩" });
      }

      const [studentRows, subjectRows] = await Promise.all([
        ctx.db
          .select({ id: students.id, studentNo: students.studentNo })
          .from(students)
          .where(eq(students.classId, input.classId)),
        ctx.db
          .select({
            subjectId: examSubjects.subjectId,
            subjectName: subjects.name,
            fullScore: examSubjects.fullScore,
          })
          .from(examSubjects)
          .leftJoin(subjects, eq(examSubjects.subjectId, subjects.id))
          .where(eq(examSubjects.examId, input.examId)),
      ]);

      const studentMap = new Map(studentRows.map((s) => [s.studentNo.trim(), s.id]));
      const subjectMap = new Map(
        subjectRows.map((s) => [s.subjectName?.trim().toLowerCase() ?? "", s])
      );

      let success = 0;
      const errors: { row: number; reason: string }[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        if (!row) continue;

        const studentId = studentMap.get(row.studentNo.trim());
        if (!studentId) {
          errors.push({ row: i + 1, reason: `学号 "${row.studentNo}" 未找到` });
          continue;
        }

        const subjectInfo = subjectMap.get(row.subjectName.trim().toLowerCase());
        if (!subjectInfo) {
          errors.push({ row: i + 1, reason: `科目 "${row.subjectName}" 未关联此考试` });
          continue;
        }

        const statusMap: Record<string, string> = {
          正常: "normal",
          缺考: "absent",
          免考: "exempt",
          normal: "normal",
          absent: "absent",
          exempt: "exempt",
        };
        const status = statusMap[row.status.trim()] ?? "normal";
        const scoreVal = row.score.trim() ? row.score.trim() : null;

        if (
          scoreVal !== null &&
          (Number.isNaN(Number(scoreVal)) || Number(scoreVal) > subjectInfo.fullScore)
        ) {
          errors.push({
            row: i + 1,
            reason: `分数 "${scoreVal}" 无效或超过满分 ${subjectInfo.fullScore}`,
          });
          continue;
        }

        try {
          await ctx.db
            .insert(scores)
            .values({
              examId: input.examId,
              studentId,
              subjectId: subjectInfo.subjectId,
              score: scoreVal,
              fullScore: subjectInfo.fullScore,
              status,
            })
            .onConflictDoUpdate({
              target: [scores.studentId, scores.examId, scores.subjectId],
              set: { score: scoreVal, status },
            });
          success++;
        } catch {
          errors.push({ row: i + 1, reason: "导入失败，请检查数据格式" });
        }
      }

      return { success, errors };
    }),
});
