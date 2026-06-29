import {
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import { classes } from "./classes";
import { exams } from "./exams";

export const examClassComments = pgTable(
	"exam_class_comments",
	{
		id: serial("id").primaryKey(),
		examId: integer("exam_id")
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		classId: integer("class_id")
			.notNull()
			.references(() => classes.id, { onDelete: "cascade" }),
		content: text("content").notNull().default(""),
		authorId: text("author_id").notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(t) => [unique("exam_class_comments_uniq").on(t.examId, t.classId)]
);
