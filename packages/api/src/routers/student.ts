import { classes } from "@student-performance/db/schema/classes";
import { exams } from "@student-performance/db/schema/exams";
import { scores } from "@student-performance/db/schema/scores";
import { students } from "@student-performance/db/schema/students";
import { subjects } from "@student-performance/db/schema/subjects";
import { TRPCError } from "@trpc/server";
import { and, avg, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../index";

const StudentCreateSchema = z.object({
	studentNo: z.string().min(1).max(50),
	name: z.string().min(1).max(100),
	gender: z.enum(["male", "female", "unset"]).optional(),
	classId: z.number().int().positive(),
	enrollYear: z.number().int().min(2000).max(2100).optional(),
	status: z.enum(["active", "leave", "transfer"]).default("active"),
	contact: z.string().max(100).optional(),
});

const StudentUpdateSchema = StudentCreateSchema.partial().omit({
	classId: true,
	studentNo: true,
});

export const studentRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				classId: z.number().int().positive().optional(),
				search: z.string().optional(),
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(20),
			})
		)
		.query(async ({ ctx, input }) => {
			const { classId, search, page, pageSize } = input;
			const offset = (page - 1) * pageSize;

			const conditions = [
				classId ? eq(students.classId, classId) : undefined,
				search
					? or(
							ilike(students.name, `%${search}%`),
							ilike(students.studentNo, `%${search}%`)
						)
					: undefined,
			].filter((c): c is NonNullable<typeof c> => c !== undefined);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [data, countResult] = await Promise.all([
				ctx.db
					.select({
						id: students.id,
						studentNo: students.studentNo,
						name: students.name,
						gender: students.gender,
						classId: students.classId,
						className: classes.name,
						status: students.status,
						enrollYear: students.enrollYear,
					})
					.from(students)
					.leftJoin(classes, eq(students.classId, classes.id))
					.where(where)
					.limit(pageSize)
					.offset(offset)
					.orderBy(students.name),
				ctx.db.select({ total: count() }).from(students).where(where),
			]);

			const total = countResult[0]?.total ?? 0;
			return { data, total, page, pageSize };
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			const [student] = await ctx.db
				.select({
					id: students.id,
					studentNo: students.studentNo,
					name: students.name,
					gender: students.gender,
					classId: students.classId,
					className: classes.name,
					enrollYear: students.enrollYear,
					status: students.status,
					contact: students.contact,
					createdAt: students.createdAt,
				})
				.from(students)
				.leftJoin(classes, eq(students.classId, classes.id))
				.where(eq(students.id, input.id));

			if (!student) {
				throw new TRPCError({ code: "NOT_FOUND", message: "学生不存在" });
			}
			return student;
		}),

	create: adminProcedure
		.input(StudentCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db
				.select({ id: students.id })
				.from(students)
				.where(
					and(
						eq(students.classId, input.classId),
						eq(students.studentNo, input.studentNo)
					)
				);

			if (existing.length > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "该班级已存在相同学号",
				});
			}

			const [created] = await ctx.db.insert(students).values(input).returning();
			return created;
		}),

	update: adminProcedure
		.input(
			z.object({ id: z.number().int().positive(), data: StudentUpdateSchema })
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(students)
				.set({ ...input.data, updatedAt: new Date() })
				.where(eq(students.id, input.id))
				.returning();
			return updated;
		}),

	updateStatus: adminProcedure
		.input(
			z.object({
				id: z.number().int().positive(),
				status: z.enum(["active", "leave", "transfer"]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(students)
				.set({ status: input.status, updatedAt: new Date() })
				.where(eq(students.id, input.id))
				.returning();
			return updated;
		}),

	bulkImport: adminProcedure
		.input(
			z.object({
				rows: z.array(
					z.object({
						studentNo: z.string(),
						name: z.string(),
						className: z.string(),
						gender: z.string().optional(),
						enrollYear: z.string().optional(),
						contact: z.string().optional(),
					})
				),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const classList = await ctx.db.select().from(classes);
			const classMap = new Map(
				classList.map((c) => [c.name.trim().toLowerCase(), c.id])
			);

			let success = 0;
			const errors: { row: number; reason: string }[] = [];

			for (let i = 0; i < input.rows.length; i++) {
				const row = input.rows[i];
				if (!row) {
					continue;
				}

				const classId = classMap.get(row.className.trim().toLowerCase());
				if (!classId) {
					errors.push({ row: i + 1, reason: `班级 "${row.className}" 不存在` });
					continue;
				}

				if (!(row.studentNo.trim() && row.name.trim())) {
					errors.push({ row: i + 1, reason: "学号或姓名不能为空" });
					continue;
				}

				const genderValue = ["male", "female"].includes(row.gender ?? "")
					? (row.gender as "male" | "female")
					: ("unset" as const);

				try {
					await ctx.db
						.insert(students)
						.values({
							studentNo: row.studentNo.trim(),
							name: row.name.trim(),
							classId,
							gender: genderValue,
							enrollYear: row.enrollYear
								? Number.parseInt(row.enrollYear)
								: undefined,
							contact: row.contact?.trim() || undefined,
							status: "active",
						})
						.onConflictDoNothing();
					success++;
				} catch {
					errors.push({ row: i + 1, reason: "插入失败，请检查数据格式" });
				}
			}

			return { success, errors };
		}),

	getScoreHistory: protectedProcedure
		.input(z.object({ studentId: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					examId: exams.id,
					examName: exams.name,
					examDate: exams.examDate,
					totalScore: scores.score,
					rankInClass: scores.rankInClass,
				})
				.from(scores)
				.innerJoin(exams, eq(scores.examId, exams.id))
				.where(
					and(
						eq(scores.studentId, input.studentId),
						eq(exams.status, "published")
					)
				)
				.orderBy(exams.examDate)
				.limit(20);

			// Aggregate per exam (sum of subject scores → total)
			const examMap = new Map<
				number,
				{
					examId: number;
					examName: string;
					examDate: string;
					total: number;
					rankInClass: number | null;
				}
			>();
			for (const row of rows) {
				const existing = examMap.get(row.examId);
				if (existing) {
					existing.total += row.totalScore ? Number(row.totalScore) : 0;
					if (existing.rankInClass === null && row.rankInClass !== null) {
						existing.rankInClass = row.rankInClass;
					}
				} else {
					examMap.set(row.examId, {
						examId: row.examId,
						examName: row.examName,
						examDate: row.examDate,
						total: row.totalScore ? Number(row.totalScore) : 0,
						rankInClass: row.rankInClass ?? null,
					});
				}
			}

			return { exams: [...examMap.values()] };
		}),

	getSubjectHistory: protectedProcedure
		.input(
			z.object({
				studentId: z.number().int().positive(),
				subjectId: z.number().int().positive(),
			})
		)
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					examId: exams.id,
					examName: exams.name,
					examDate: exams.examDate,
					score: scores.score,
					rankInClass: scores.rankInClass,
				})
				.from(scores)
				.innerJoin(exams, eq(scores.examId, exams.id))
				.where(
					and(
						eq(scores.studentId, input.studentId),
						eq(scores.subjectId, input.subjectId),
						eq(exams.status, "published")
					)
				)
				.orderBy(exams.examDate)
				.limit(20);

			return {
				exams: rows.map((r) => ({
					examId: r.examId,
					examName: r.examName,
					examDate: r.examDate,
					score: r.score ? Number(r.score) : null,
					classSubjectRank: r.rankInClass,
				})),
			};
		}),

	getLatestSubjectScores: protectedProcedure
		.input(z.object({ studentId: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			const [student] = await ctx.db
				.select({ id: students.id, classId: students.classId })
				.from(students)
				.where(eq(students.id, input.studentId));
			if (!student) {
				throw new TRPCError({ code: "NOT_FOUND", message: "学生不存在" });
			}

			// Find the latest published exam this student has scores in
			const latestExamRows = await ctx.db
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

			const latestExam = latestExamRows[0];
			if (!latestExam) {
				return { biasScore: 0, examId: null, scores: [] };
			}

			const scoreRows = await ctx.db
				.select({
					subjectId: scores.subjectId,
					subjectName: subjects.name,
					score: scores.score,
					fullScore: scores.fullScore,
				})
				.from(scores)
				.innerJoin(subjects, eq(scores.subjectId, subjects.id))
				.where(
					and(
						eq(scores.examId, latestExam.examId),
						eq(scores.studentId, input.studentId)
					)
				);

			// Class averages per subject for the same exam
			const classAvgRows = await ctx.db
				.select({
					subjectId: scores.subjectId,
					classAvg: avg(scores.score),
				})
				.from(scores)
				.innerJoin(students, eq(scores.studentId, students.id))
				.where(
					and(
						eq(scores.examId, latestExam.examId),
						eq(students.classId, student.classId)
					)
				)
				.groupBy(scores.subjectId);

			const avgMap = new Map(
				classAvgRows.map((r) => [r.subjectId, Number(r.classAvg ?? 0)])
			);

			const result = scoreRows.map((r) => {
				const scoreNum = r.score ? Number(r.score) : 0;
				const fullScore = r.fullScore;
				const classAvg = avgMap.get(r.subjectId) ?? 0;
				return {
					subjectId: r.subjectId,
					subjectName: r.subjectName ?? "",
					score: scoreNum,
					fullScore,
					classAvg,
					normalizedScore: fullScore > 0 ? (scoreNum / fullScore) * 100 : 0,
				};
			});

			// Bias score (偏科度)
			const normalizedScores = result.map((r) => r.normalizedScore);
			const biasScore =
				normalizedScores.length >= 2
					? Math.max(...normalizedScores) - Math.min(...normalizedScores)
					: 0;

			return { scores: result, biasScore, examId: latestExam.examId };
		}),

	getOne: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			const [student] = await ctx.db
				.select({
					id: students.id,
					studentNo: students.studentNo,
					name: students.name,
					gender: students.gender,
					classId: students.classId,
					className: classes.name,
					enrollYear: students.enrollYear,
					status: students.status,
					contact: students.contact,
				})
				.from(students)
				.leftJoin(classes, eq(students.classId, classes.id))
				.where(eq(students.id, input.id));
			if (!student) {
				throw new TRPCError({ code: "NOT_FOUND", message: "学生不存在" });
			}
			return student;
		}),
});
