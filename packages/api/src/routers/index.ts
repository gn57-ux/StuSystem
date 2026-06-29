import { publicProcedure, router } from "../index";

import { analyticsRouter } from "./analytics";
import { classRouter } from "./class";
import { examRouter } from "./exam";
import { noteRouter } from "./note";
import { reportRouter } from "./report";
import { scoreRouter } from "./score";
import { studentRouter } from "./student";
import { subjectRouter } from "./subject";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  analytics: analyticsRouter,
  class: classRouter,
  exam: examRouter,
  note: noteRouter,
  report: reportRouter,
  score: scoreRouter,
  student: studentRouter,
  subject: subjectRouter,
});

export type AppRouter = typeof appRouter;
