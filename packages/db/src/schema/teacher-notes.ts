import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { students } from "./students";

export const teacherNotes = pgTable(
	"teacher_notes",
	{
		id: serial("id").primaryKey(),
		studentId: integer("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		authorId: text("author_id").notNull(),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("teacher_notes_student_idx").on(table.studentId)]
);
