import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

import { exams } from "./exams";
import { students } from "./students";

export const studentAlerts = pgTable(
	"student_alerts",
	{
		id: serial("id").primaryKey(),
		studentId: integer("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		examId: integer("exam_id")
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		alertType: varchar("alert_type", { length: 50 }).notNull(),
		severity: varchar("severity", { length: 20 }).notNull().default("warning"),
		status: varchar("status", { length: 20 }).notNull().default("open"),
		note: text("note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("student_alerts_student_exam_idx").on(table.studentId, table.examId),
		index("student_alerts_status_idx").on(table.status),
	]
);
