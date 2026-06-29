import type { db as dbInstance } from "@student-performance/db";
import { examClasses } from "@student-performance/db/schema/exam-classes";
import { examSubjects } from "@student-performance/db/schema/exam-subjects";
import { exams } from "@student-performance/db/schema/exams";
import { scores } from "@student-performance/db/schema/scores";
import { studentAlerts } from "@student-performance/db/schema/student-alerts";
import { students } from "@student-performance/db/schema/students";
import { subjects } from "@student-performance/db/schema/subjects";
import { TRPCError } from "@trpc/server";
import {
	and,
	avg,
	count,
	desc,
	eq,
	inArray,
	lt,
	max,
	min,
	sql,
} from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

type DbInstance = typeof dbInstance;

type AlertRow = {
	alertType: string;
	examId: number;
	severity: string;
	studentId: number;
};

function collectLowRankAlerts(
	totalRows: { rankInClass: number | null; studentId: number }[],
	examId: number
): AlertRow[] {
	const classSize = totalRows.length;
	const threshold = Math.ceil(classSize * 0.8);
	return totalRows
		.filter((r) => (r.rankInClass ?? 0) > threshold)
		.map((r) => ({
			alertType: "total_low",
			examId,
			severity: "warning",
			studentId: r.studentId,
		}));
}

async function collectWeakSubjectAlerts(
	db: DbInstance,
	examId: number,
	studentIds: number[]
): Promise<AlertRow[]> {
	const subjectScoreRows = await db
		.select({ avgScore: avg(scores.score), subjectId: scores.subjectId })
		.from(scores)
		.where(
			and(eq(scores.examId, examId), inArray(scores.studentId, studentIds))
		)
		.groupBy(scores.subjectId);

	const subjectAvgMap = new Map(
		subjectScoreRows.map((r) => [r.subjectId, Number(r.avgScore ?? 0)])
	);

	const allScoreRows = await db
		.select({
			score: scores.score,
			studentId: scores.studentId,
			subjectId: scores.subjectId,
		})
		.from(scores)
		.where(
			and(eq(scores.examId, examId), inArray(scores.studentId, studentIds))
		);

	const weakStudents = new Set<number>();
	for (const row of allScoreRows) {
		if (!row.score) {
			continue;
		}
		const subjectAvg = subjectAvgMap.get(row.subjectId) ?? 0;
		if (Number(row.score) < subjectAvg - 15) {
			weakStudents.add(row.studentId);
		}
	}
	return [...weakStudents].map((studentId) => ({
		alertType: "subject_weak",
		examId,
		severity: "warning",
		studentId,
	}));
}

async function processAlertsForClass(
	db: DbInstance,
	examId: number,
	classId: number
): Promise<void> {
	const classStudentIds = await db
		.select({ id: students.id })
		.from(students)
		.where(eq(students.classId, classId));

	if (classStudentIds.length === 0) {
		return;
	}

	const studentIdList = classStudentIds.map((s) => s.id);

	const totalRows = await db
		.select({
			rankInClass: scores.rankInClass,
			studentId: scores.studentId,
			total: sql<number>`SUM(CAST(${scores.score} AS NUMERIC))`,
		})
		.from(scores)
		.where(
			and(eq(scores.examId, examId), inArray(scores.studentId, studentIdList))
		)
		.groupBy(scores.studentId, scores.rankInClass);

	const lowRankAlerts = await collectLowRankAlerts(totalRows, examId);
	const weakAlerts = await collectWeakSubjectAlerts(db, examId, studentIdList);
	const alertsToInsert = [...lowRankAlerts, ...weakAlerts];

	if (alertsToInsert.length === 0) {
		return;
	}

	await db
		.delete(studentAlerts)
		.where(
			and(
				eq(studentAlerts.examId, examId),
				inArray(studentAlerts.studentId, studentIdList)
			)
		);
	for (const alert of alertsToInsert) {
		await db.insert(studentAlerts).values(alert);
	}
}

export async function computeAlertsForExam(
	db: DbInstance,
	examId: number
): Promise<void> {
	const classRows = await db
		.select({ classId: examClasses.classId })
		.from(examClasses)
		.where(eq(examClasses.examId, examId));

	for (const { classId } of classRows) {
		await processAlertsForClass(db, examId, classId);
	}
}

const ClassStatsInput = z.object({
	classId: z.number().int().positive(),
	examId: z.number().int().positive(),
});

const RankChangesInput = z.object({
	classId: z.number().int().positive(),
	examId: z.number().int().positive(),
});

const SubjectStatsInput = z.object({
	classId: z.number().int().positive(),
	examId: z.number().int().positive(),
	subjectId: z.number().int().positive(),
});

const AlertsInput = z.object({
	classId: z.number().int().positive(),
	examId: z.number().int().positive(),
});

export const analyticsRouter = router({
	classStats: protectedProcedure
		.input(ClassStatsInput)
		.query(async ({ ctx, input }) => {
			const [exam] = await ctx.db
				.select({ examDate: exams.examDate, id: exams.id, status: exams.status })
				.from(exams)
				.where(eq(exams.id, input.examId));
			if (!exam) {
				throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
			}

			const classStudentsSq = ctx.db
				.select({ id: students.id })
				.from(students)
				.where(eq(students.classId, input.classId));

			// Per-student total score (sum of all subject scores)
			const totalScoresSq = ctx.db
				.select({
					studentId: scores.studentId,
					total: sql<number>`SUM(CAST(${scores.score} AS NUMERIC))`.as("total"),
				})
				.from(scores)
				.where(
					and(
						eq(scores.examId, input.examId),
						inArray(scores.studentId, classStudentsSq)
					)
				)
				.groupBy(scores.studentId)
				.as("totals");

			const [aggRow] = await ctx.db
				.select({
					studentCount: count(totalScoresSq.studentId),
					avgTotal: avg(totalScoresSq.total),
					maxTotal: max(totalScoresSq.total),
					minTotal: min(totalScoresSq.total),
					medianTotal: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${totalScoresSq.total})`,
					stddevTotal: sql<number>`STDDEV_POP(${totalScoresSq.total})`,
					passCount: sql<number>`SUM(CASE WHEN ${totalScoresSq.total} >= 60 * (SELECT COUNT(*) FROM ${examSubjects} WHERE exam_id = ${input.examId}) THEN 1 ELSE 0 END)`,
					excellentCount: sql<number>`SUM(CASE WHEN ${totalScoresSq.total} >= 85 * (SELECT COUNT(*) FROM ${examSubjects} WHERE exam_id = ${input.examId}) THEN 1 ELSE 0 END)`,
				})
				.from(totalScoresSq);

			// Distribution buckets (using totalScoresSq)
			const distributionRaw = await ctx.db
				.select({
					bucket: sql<string>`
            CASE
              WHEN ${totalScoresSq.total} < 60 THEN '0-59'
              WHEN ${totalScoresSq.total} < 75 THEN '60-74'
              WHEN ${totalScoresSq.total} < 90 THEN '75-89'
              ELSE '90+'
            END`,
					cnt: count(totalScoresSq.studentId),
				})
				.from(totalScoresSq)
				.groupBy(
					sql`CASE
              WHEN ${totalScoresSq.total} < 60 THEN '0-59'
              WHEN ${totalScoresSq.total} < 75 THEN '60-74'
              WHEN ${totalScoresSq.total} < 90 THEN '75-89'
              ELSE '90+'
            END`
				);

			// Subject averages
			const subjectAvgsRaw = await ctx.db
				.select({
					subjectId: scores.subjectId,
					subjectName: subjects.name,
					avgScore: avg(scores.score),
				})
				.from(scores)
				.leftJoin(subjects, eq(scores.subjectId, subjects.id))
				.where(
					and(
						eq(scores.examId, input.examId),
						inArray(scores.studentId, classStudentsSq)
					)
				)
				.groupBy(scores.subjectId, subjects.name);

			// Previous exam comparison (last published exam for this class)
			const prevExamRows = await ctx.db
				.select({ id: exams.id })
				.from(exams)
				.innerJoin(examClasses, eq(examClasses.examId, exams.id))
				.where(
					and(
						eq(examClasses.classId, input.classId),
						eq(exams.status, "published"),
						lt(exams.examDate, exam.examDate)
					)
				)
				.orderBy(desc(exams.examDate))
				.limit(1);

			let prevExamAvg: number | null = null;
			const prevExam = prevExamRows[0];
			if (prevExam) {
				const prevTotalsSq = ctx.db
					.select({
						total: sql<number>`SUM(CAST(${scores.score} AS NUMERIC))`.as(
							"total"
						),
					})
					.from(scores)
					.where(
						and(
							eq(scores.examId, prevExam.id),
							inArray(scores.studentId, classStudentsSq)
						)
					)
					.groupBy(scores.studentId)
					.as("prev_totals");

				const [prevAgg] = await ctx.db
					.select({ avgTotal: avg(prevTotalsSq.total) })
					.from(prevTotalsSq);
				prevExamAvg = prevAgg?.avgTotal ? Number(prevAgg.avgTotal) : null;
			}

			const total = Number(aggRow?.studentCount ?? 0);
			const passCount = Number(aggRow?.passCount ?? 0);
			const excellentCount = Number(aggRow?.excellentCount ?? 0);

			return {
				avgTotal: aggRow?.avgTotal ? Number(aggRow.avgTotal) : 0,
				distribution: distributionRaw.map((r) => ({
					count: Number(r.cnt),
					range: r.bucket,
				})),
				excellentRate: total > 0 ? excellentCount / total : 0,
				lowRate: total > 0 ? (total - passCount) / total : 0,
				maxTotal: aggRow?.maxTotal ? Number(aggRow.maxTotal) : 0,
				medianTotal: aggRow?.medianTotal ? Number(aggRow.medianTotal) : 0,
				minTotal: aggRow?.minTotal ? Number(aggRow.minTotal) : 0,
				passRate: total > 0 ? passCount / total : 0,
				prevExamAvg,
				stddevTotal: aggRow?.stddevTotal ? Number(aggRow.stddevTotal) : 0,
				studentCount: total,
				subjectAvgs: subjectAvgsRaw.map((r) => ({
					avg: r.avgScore ? Number(r.avgScore) : 0,
					subjectId: r.subjectId,
					subjectName: r.subjectName ?? "",
				})),
			};
		}),

	classRankChanges: protectedProcedure
		.input(RankChangesInput)
		.query(async ({ ctx, input }) => {
			const classStudentsSq = ctx.db
				.select({ id: students.id })
				.from(students)
				.where(eq(students.classId, input.classId));

			// Current exam: total + rank per student
			const currentTotals = await ctx.db
				.select({
					studentId: scores.studentId,
					rankInClass: scores.rankInClass,
					total: sql<number>`SUM(CAST(${scores.score} AS NUMERIC))`,
				})
				.from(scores)
				.where(
					and(
						eq(scores.examId, input.examId),
						inArray(scores.studentId, classStudentsSq)
					)
				)
				.groupBy(scores.studentId, scores.rankInClass);

			if (currentTotals.length === 0) {
				return { top5declined: [], top5improved: [] };
			}

			// Previous published exam for this class
			const prevExamRows = await ctx.db
				.select({ id: exams.id })
				.from(exams)
				.innerJoin(examClasses, eq(examClasses.examId, exams.id))
				.where(
					and(
						eq(examClasses.classId, input.classId),
						eq(exams.status, "published")
					)
				)
				.orderBy(desc(exams.examDate))
				.limit(2);

			// Take the second most-recent (the one before current)
			const prevExam = prevExamRows[1] ?? prevExamRows[0];
			if (!prevExam || prevExam.id === input.examId) {
				return { top5declined: [], top5improved: [] };
			}

			const prevTotals = await ctx.db
				.select({
					rankInClass: scores.rankInClass,
					studentId: scores.studentId,
				})
				.from(scores)
				.where(
					and(
						eq(scores.examId, prevExam.id),
						inArray(scores.studentId, classStudentsSq)
					)
				)
				.groupBy(scores.studentId, scores.rankInClass);

			const prevRankMap = new Map(
				prevTotals.map((r) => [r.studentId, r.rankInClass])
			);

			const studentIds = currentTotals.map((r) => r.studentId);
			const studentNames =
				studentIds.length > 0
					? await ctx.db
							.select({ id: students.id, name: students.name })
							.from(students)
							.where(inArray(students.id, studentIds))
					: [];
			const nameMap = new Map(studentNames.map((s) => [s.id, s.name]));

			const deltas = currentTotals
				.map((cur) => {
					const prev = prevRankMap.get(cur.studentId);
					const delta = prev == null ? 0 : prev - (cur.rankInClass ?? 0);
					return {
						delta,
						name: nameMap.get(cur.studentId) ?? "",
						studentId: cur.studentId,
					};
				})
				.filter((d) => d.delta !== 0);

			const sorted = [...deltas].sort((a, b) => b.delta - a.delta);
			const top5improved = sorted.slice(0, 5).filter((d) => d.delta > 0);
			const top5declined = sorted
				.slice(-5)
				.reverse()
				.filter((d) => d.delta < 0);

			return { top5declined, top5improved };
		}),

	subjectStats: protectedProcedure
		.input(SubjectStatsInput)
		.query(async ({ ctx, input }) => {
			const classStudentsSq = ctx.db
				.select({ id: students.id })
				.from(students)
				.where(eq(students.classId, input.classId));

			const rows = await ctx.db
				.select({
					name: students.name,
					score: scores.score,
					studentId: scores.studentId,
				})
				.from(scores)
				.innerJoin(students, eq(scores.studentId, students.id))
				.where(
					and(
						eq(scores.examId, input.examId),
						eq(scores.subjectId, input.subjectId),
						inArray(scores.studentId, classStudentsSq)
					)
				)
				.orderBy(desc(scores.score));

			const numericRows = rows.map((r) => ({
				name: r.name,
				score: r.score == null ? null : Number(r.score),
				studentId: r.studentId,
			}));

			const validScores = numericRows
				.filter((r) => r.score != null)
				.map((r) => r.score as number);
			const total = validScores.length;
			const avgScore =
				total > 0 ? validScores.reduce((a, b) => a + b, 0) / total : 0;
			const maxScore = total > 0 ? Math.max(...validScores) : 0;
			const minScore = total > 0 ? Math.min(...validScores) : 0;

			const studentRanks = numericRows.map((r, i) => ({
				name: r.name,
				rank: i + 1,
				score: r.score,
				studentId: r.studentId,
			}));

			const lowScoreStudents = numericRows
				.filter((r) => r.score != null && r.score < avgScore - 15)
				.map((r) => ({ name: r.name, score: r.score, studentId: r.studentId }));

			return {
				avg: avgScore,
				lowScoreStudents,
				max: maxScore,
				min: minScore,
				studentRanks,
			};
		}),

	alerts: protectedProcedure
		.input(AlertsInput)
		.query(async ({ ctx, input }) => {
			const classStudentsSq = ctx.db
				.select({ id: students.id })
				.from(students)
				.where(eq(students.classId, input.classId));

			const rows = await ctx.db
				.select({
					alertType: studentAlerts.alertType,
					id: studentAlerts.id,
					name: students.name,
					note: studentAlerts.note,
					severity: studentAlerts.severity,
					status: studentAlerts.status,
					studentId: studentAlerts.studentId,
				})
				.from(studentAlerts)
				.innerJoin(students, eq(studentAlerts.studentId, students.id))
				.where(
					and(
						eq(studentAlerts.examId, input.examId),
						inArray(studentAlerts.studentId, classStudentsSq)
					)
				);

			return rows;
		}),

	computeAlerts: protectedProcedure
		.input(
			z.object({
				classId: z.number().int().positive(),
				examId: z.number().int().positive(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const [exam] = await ctx.db
				.select({ id: exams.id })
				.from(exams)
				.where(eq(exams.id, input.examId));
			if (!exam) {
				throw new TRPCError({ code: "NOT_FOUND", message: "考试不存在" });
			}
			await processAlertsForClass(ctx.db, input.examId, input.classId);
			return { success: true };
		}),

	studentAlerts: protectedProcedure
		.input(z.object({ studentId: z.number().int().positive() }))
		.query(async ({ ctx, input }) =>
			ctx.db
				.select({
					alertType: studentAlerts.alertType,
					examId: studentAlerts.examId,
					id: studentAlerts.id,
					note: studentAlerts.note,
					severity: studentAlerts.severity,
					status: studentAlerts.status,
				})
				.from(studentAlerts)
				.where(
					and(
						eq(studentAlerts.studentId, input.studentId),
						eq(studentAlerts.status, "open")
					)
				)
		),

	resolveAlert: protectedProcedure
		.input(
			z.object({
				alertId: z.number().int().positive(),
				note: z.string().optional(),
				status: z.enum(["confirmed", "ignored"]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(studentAlerts)
				.set({ status: input.status, note: input.note })
				.where(eq(studentAlerts.id, input.alertId))
				.returning();
			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND", message: "预警不存在" });
			}
			return updated;
		}),
});
