import { user } from "@student-performance/db/schema/auth";
import { examClassComments } from "@student-performance/db/schema/exam-class-comments";
import { exams } from "@student-performance/db/schema/exams";
import { scores } from "@student-performance/db/schema/scores";
import { studentAlerts } from "@student-performance/db/schema/student-alerts";
import { students } from "@student-performance/db/schema/students";
import { subjects } from "@student-performance/db/schema/subjects";
import { teacherNotes } from "@student-performance/db/schema/teacher-notes";
import { TRPCError } from "@trpc/server";
import { and, avg, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const reportRouter = router({
	classReport: protectedProcedure
		.input(
			z.object({
				classId: z.number().int().positive(),
				examId: z.number().int().positive(),
			})
		)
		.query(async ({ ctx, input }) => {
			const [exam] = await ctx.db
				.select({ id: exams.id, name: exams.name, status: exams.status })
				.from(exams)
				.where(eq(exams.id, input.examId));
			if (!exam) {
				throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
			}

			const classStudentsSq = ctx.db
				.select({ id: students.id })
				.from(students)
				.where(eq(students.classId, input.classId));

			const scoreRows = await ctx.db
				.select({
					rankInClass: scores.rankInClass,
					score: scores.score,
					studentId: scores.studentId,
					subjectId: scores.subjectId,
					subjectName: subjects.name,
				})
				.from(scores)
				.leftJoin(subjects, eq(scores.subjectId, subjects.id))
				.where(
					and(
						eq(scores.examId, input.examId),
						inArray(scores.studentId, classStudentsSq)
					)
				);

			// Aggregate total scores per student
			const totalsMap = new Map<number, number>();
			for (const row of scoreRows) {
				const prev = totalsMap.get(row.studentId) ?? 0;
				totalsMap.set(row.studentId, prev + Number(row.score ?? 0));
			}
			const totals = [...totalsMap.values()];
			const studentCount = totals.length;
			const avgTotal =
				studentCount > 0 ? totals.reduce((a, b) => a + b, 0) / studentCount : 0;
			const maxTotal = studentCount > 0 ? Math.max(...totals) : 0;
			const minTotal = studentCount > 0 ? Math.min(...totals) : 0;

			// Subject averages
			const subjectMap = new Map<number, { name: string; scores: number[] }>();
			for (const row of scoreRows) {
				const existing = subjectMap.get(row.subjectId);
				if (existing) {
					existing.scores.push(Number(row.score ?? 0));
				} else {
					subjectMap.set(row.subjectId, {
						name: row.subjectName ?? "",
						scores: [Number(row.score ?? 0)],
					});
				}
			}
			const subjectAvgs = [...subjectMap.entries()].map(
				([subjectId, data]) => ({
					avg: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
					subjectId,
					subjectName: data.name,
				})
			);

			// Alerts
			const alertRows = await ctx.db
				.select({
					alertType: studentAlerts.alertType,
					id: studentAlerts.id,
					severity: studentAlerts.severity,
					status: studentAlerts.status,
					studentId: studentAlerts.studentId,
					studentName: students.name,
				})
				.from(studentAlerts)
				.leftJoin(students, eq(studentAlerts.studentId, students.id))
				.where(
					and(
						eq(studentAlerts.examId, input.examId),
						eq(studentAlerts.status, "open"),
						inArray(studentAlerts.studentId, classStudentsSq)
					)
				);

			// Comment
			const [comment] = await ctx.db
				.select({ content: examClassComments.content })
				.from(examClassComments)
				.where(
					and(
						eq(examClassComments.examId, input.examId),
						eq(examClassComments.classId, input.classId)
					)
				);

			return {
				alerts: alertRows,
				avgTotal,
				comment: comment?.content ?? "",
				examName: exam.name,
				maxTotal,
				minTotal,
				studentCount,
				subjectAvgs,
			};
		}),

	studentReport: protectedProcedure
		.input(
			z.object({
				examId: z.number().int().positive().optional(),
				studentId: z.number().int().positive(),
			})
		)
		.query(async ({ ctx, input }) => {
			const [student] = await ctx.db
				.select({
					classId: students.classId,
					id: students.id,
					name: students.name,
					studentNo: students.studentNo,
				})
				.from(students)
				.where(eq(students.id, input.studentId));
			if (!student) {
				throw new TRPCError({ code: "NOT_FOUND", message: "学生不存在" });
			}

			// Latest exam if not provided
			let examId = input.examId;
			if (!examId) {
				const [latest] = await ctx.db
					.select({ examId: scores.examId })
					.from(scores)
					.innerJoin(exams, eq(scores.examId, exams.id))
					.where(
						and(
							eq(scores.studentId, input.studentId),
							eq(exams.status, "published")
						)
					)
					.orderBy(desc(exams.examDate))
					.limit(1);
				examId = latest?.examId;
			}

			// Latest subject scores
			const latestScoreRows = examId
				? await ctx.db
						.select({
							score: scores.score,
							subjectId: scores.subjectId,
							subjectName: subjects.name,
						})
						.from(scores)
						.leftJoin(subjects, eq(scores.subjectId, subjects.id))
						.where(
							and(
								eq(scores.examId, examId),
								eq(scores.studentId, input.studentId)
							)
						)
				: [];

			// Alerts
			const alerts = await ctx.db
				.select({
					alertType: studentAlerts.alertType,
					examId: studentAlerts.examId,
					id: studentAlerts.id,
					severity: studentAlerts.severity,
					status: studentAlerts.status,
				})
				.from(studentAlerts)
				.where(
					and(
						eq(studentAlerts.studentId, input.studentId),
						eq(studentAlerts.status, "open")
					)
				);

			// Recent notes (last 3)
			const recentNotes = await ctx.db
				.select({
					authorName: user.name,
					content: teacherNotes.content,
					createdAt: teacherNotes.createdAt,
					id: teacherNotes.id,
				})
				.from(teacherNotes)
				.leftJoin(user, eq(teacherNotes.authorId, user.id))
				.where(eq(teacherNotes.studentId, input.studentId))
				.orderBy(desc(teacherNotes.createdAt))
				.limit(3);

			// Class avg per subject for comparison
			const subjectAvgRows = examId
				? await ctx.db
						.select({
							avgScore: avg(scores.score),
							subjectId: scores.subjectId,
						})
						.from(scores)
						.innerJoin(students, eq(scores.studentId, students.id))
						.where(
							and(
								eq(scores.examId, examId),
								eq(students.classId, student.classId)
							)
						)
						.groupBy(scores.subjectId)
				: [];

			const avgMap = new Map(
				subjectAvgRows.map((r) => [r.subjectId, Number(r.avgScore ?? 0)])
			);

			return {
				alerts,
				latestScores: latestScoreRows.map((r) => ({
					classAvg: avgMap.get(r.subjectId) ?? 0,
					score: Number(r.score ?? 0),
					subjectId: r.subjectId,
					subjectName: r.subjectName ?? "",
				})),
				recentNotes,
				student,
			};
		}),

	saveComment: protectedProcedure
		.input(
			z.object({
				classId: z.number().int().positive(),
				content: z.string().max(5000),
				examId: z.number().int().positive(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			await ctx.db
				.insert(examClassComments)
				.values({
					authorId: ctx.user.id,
					classId: input.classId,
					content: input.content,
					examId: input.examId,
				})
				.onConflictDoUpdate({
					set: {
						authorId: ctx.user.id,
						content: input.content,
						updatedAt: new Date(),
					},
					target: [examClassComments.examId, examClassComments.classId],
				});

			return { success: true };
		}),

	exportScores: protectedProcedure
		.input(
			z.object({
				classId: z.number().int().positive(),
				examId: z.number().int().positive(),
				subjectId: z.number().int().positive().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const classStudentsSq = ctx.db
				.select({ id: students.id })
				.from(students)
				.where(eq(students.classId, input.classId));

			const conditions = [
				eq(scores.examId, input.examId),
				inArray(scores.studentId, classStudentsSq),
			];
			if (input.subjectId) {
				conditions.push(eq(scores.subjectId, input.subjectId));
			}

			const rows = await ctx.db
				.select({
					fullScore: scores.fullScore,
					rankInClass: scores.rankInClass,
					score: scores.score,
					status: scores.status,
					studentId: scores.studentId,
					studentName: students.name,
					studentNo: students.studentNo,
					subjectName: subjects.name,
				})
				.from(scores)
				.innerJoin(students, eq(scores.studentId, students.id))
				.leftJoin(subjects, eq(scores.subjectId, subjects.id))
				.where(and(...conditions))
				.orderBy(students.studentNo, subjects.name);

			return {
				rows: rows.map((r) => ({
					fullScore: r.fullScore,
					rankInClass: r.rankInClass,
					score: r.score ? Number(r.score) : null,
					status: r.status,
					studentName: r.studentName,
					studentNo: r.studentNo,
					subjectName: r.subjectName ?? "",
				})),
			};
		}),
});
