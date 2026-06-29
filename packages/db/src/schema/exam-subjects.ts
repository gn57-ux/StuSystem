import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { exams } from "./exams";
import { subjects } from "./subjects";

export const examSubjects = pgTable(
	"exam_subjects",
	{
		examId: integer("exam_id")
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		subjectId: integer("subject_id")
			.notNull()
			.references(() => subjects.id),
		fullScore: integer("full_score").notNull().default(100),
	},
	(table) => [primaryKey({ columns: [table.examId, table.subjectId] })]
);
