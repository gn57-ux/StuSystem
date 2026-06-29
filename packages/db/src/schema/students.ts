import {
	index,
	integer,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

import { classes } from "./classes";

export const students = pgTable(
	"students",
	{
		id: serial("id").primaryKey(),
		studentNo: varchar("student_no", { length: 50 }).notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		gender: varchar("gender", { length: 10 }),
		classId: integer("class_id")
			.notNull()
			.references(() => classes.id),
		enrollYear: integer("enroll_year"),
		status: varchar("status", { length: 20 }).notNull().default("active"),
		contact: varchar("contact", { length: 100 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("students_class_idx").on(table.classId),
		index("students_class_no_idx").on(table.classId, table.studentNo),
	]
);
