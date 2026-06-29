import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { classes } from "./classes";
import { exams } from "./exams";

export const examClasses = pgTable(
	"exam_classes",
	{
		examId: integer("exam_id")
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		classId: integer("class_id")
			.notNull()
			.references(() => classes.id),
	},
	(table) => [primaryKey({ columns: [table.examId, table.classId] })]
);
