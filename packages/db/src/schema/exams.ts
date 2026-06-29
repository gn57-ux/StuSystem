import {
	date,
	index,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const exams = pgTable(
	"exams",
	{
		id: serial("id").primaryKey(),
		name: varchar("name", { length: 200 }).notNull(),
		type: varchar("type", { length: 50 }).notNull(),
		examDate: date("exam_date").notNull(),
		status: varchar("status", { length: 20 }).notNull().default("draft"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("exams_status_idx").on(table.status),
		index("exams_date_idx").on(table.examDate),
	]
);
