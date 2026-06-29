import {
	index,
	integer,
	numeric,
	pgTable,
	serial,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";

import { exams } from "./exams";
import { students } from "./students";
import { subjects } from "./subjects";

export const scores = pgTable(
	"scores",
	{
		id: serial("id").primaryKey(),
		studentId: integer("student_id")
			.notNull()
			.references(() => students.id),
		examId: integer("exam_id")
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		subjectId: integer("subject_id")
			.notNull()
			.references(() => subjects.id),
		score: numeric("score", { precision: 6, scale: 2 }),
		fullScore: integer("full_score").notNull().default(100),
		status: varchar("status", { length: 20 }).notNull().default("pending"),
		rankInClass: integer("rank_in_class"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("scores_student_exam_subject_uniq").on(
			table.studentId,
			table.examId,
			table.subjectId
		),
		index("scores_exam_class_idx").on(table.examId, table.studentId),
		index("scores_student_idx").on(table.studentId),
	]
);
