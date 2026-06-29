import { relations } from "drizzle-orm";

import { classes } from "./classes";
import { examClasses } from "./exam-classes";
import { examSubjects } from "./exam-subjects";
import { exams } from "./exams";
import { scores } from "./scores";
import { studentAlerts } from "./student-alerts";
import { students } from "./students";
import { subjects } from "./subjects";
import { teacherNotes } from "./teacher-notes";

export const classRelations = relations(classes, ({ many }) => ({
	students: many(students),
	examClasses: many(examClasses),
}));

export const studentRelations = relations(students, ({ one, many }) => ({
	class: one(classes, { fields: [students.classId], references: [classes.id] }),
	scores: many(scores),
	teacherNotes: many(teacherNotes),
	alerts: many(studentAlerts),
}));

export const subjectRelations = relations(subjects, ({ many }) => ({
	examSubjects: many(examSubjects),
	scores: many(scores),
}));

export const examRelations = relations(exams, ({ many }) => ({
	examClasses: many(examClasses),
	examSubjects: many(examSubjects),
	scores: many(scores),
	alerts: many(studentAlerts),
}));

export const examClassRelations = relations(examClasses, ({ one }) => ({
	exam: one(exams, { fields: [examClasses.examId], references: [exams.id] }),
	class: one(classes, {
		fields: [examClasses.classId],
		references: [classes.id],
	}),
}));

export const examSubjectRelations = relations(examSubjects, ({ one }) => ({
	exam: one(exams, { fields: [examSubjects.examId], references: [exams.id] }),
	subject: one(subjects, {
		fields: [examSubjects.subjectId],
		references: [subjects.id],
	}),
}));

export const scoreRelations = relations(scores, ({ one }) => ({
	student: one(students, {
		fields: [scores.studentId],
		references: [students.id],
	}),
	exam: one(exams, { fields: [scores.examId], references: [exams.id] }),
	subject: one(subjects, {
		fields: [scores.subjectId],
		references: [subjects.id],
	}),
}));

export const teacherNoteRelations = relations(teacherNotes, ({ one }) => ({
	student: one(students, {
		fields: [teacherNotes.studentId],
		references: [students.id],
	}),
}));

export const studentAlertRelations = relations(studentAlerts, ({ one }) => ({
	student: one(students, {
		fields: [studentAlerts.studentId],
		references: [students.id],
	}),
	exam: one(exams, { fields: [studentAlerts.examId], references: [exams.id] }),
}));
