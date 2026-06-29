import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@student-performance/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@student-performance/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/analytics/subject")({
	validateSearch: z.object({
		classId: z.number().int().positive().optional(),
		examId: z.number().int().positive().optional(),
		subjectId: z.number().int().positive().optional(),
	}),
	component: SubjectAnalyticsPage,
});

function SubjectAnalyticsPage() {
	const { classId, examId, subjectId } = Route.useSearch();
	const navigate = useNavigate();

	const { data: examList = [] } = useQuery(
		trpc.exam.list.queryOptions({ status: "published" })
	);
	const { data: classList = [] } = useQuery(trpc.class.list.queryOptions());
	const { data: subjectList = [] } = useQuery(trpc.subject.list.queryOptions());

	const hasSelection = !!examId && !!classId && !!subjectId;

	const { data: subjectStats, isLoading } = useQuery({
		...trpc.analytics.subjectStats.queryOptions({
			examId: examId ?? 0,
			classId: classId ?? 0,
			subjectId: subjectId ?? 0,
		}),
		enabled: hasSelection,
	});

	const selectedSubject = subjectList.find((s) => s.id === subjectId);

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">科目分析</h1>
				<div className="flex items-center gap-2">
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								to: "/analytics/subject",
								search: (prev) => ({
									...prev,
									examId: e.target.value ? Number(e.target.value) : undefined,
								}),
							});
						}}
						value={examId ?? ""}
					>
						<option value="">选择考试…</option>
						{examList.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								to: "/analytics/subject",
								search: (prev) => ({
									...prev,
									classId: e.target.value ? Number(e.target.value) : undefined,
								}),
							});
						}}
						value={classId ?? ""}
					>
						<option value="">选择班级…</option>
						{classList.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								to: "/analytics/subject",
								search: (prev) => ({
									...prev,
									subjectId: e.target.value
										? Number(e.target.value)
										: undefined,
								}),
							});
						}}
						value={subjectId ?? ""}
					>
						<option value="">选择科目…</option>
						{subjectList.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{!hasSelection && (
				<div className="py-16 text-center text-muted-foreground">
					请选择考试、班级和科目
				</div>
			)}

			{hasSelection && isLoading && (
				<div className="py-16 text-center text-muted-foreground">加载中…</div>
			)}

			{hasSelection && subjectStats && (
				<div className="space-y-4">
					{/* 概况卡片 */}
					<div className="grid grid-cols-3 gap-4">
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">均分</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{subjectStats.avg.toFixed(1)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">
									最高 / 最低
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{subjectStats.max.toFixed(0)} / {subjectStats.min.toFixed(0)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">低分人数</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl text-red-500">
									{subjectStats.lowScoreStudents.length}
								</p>
								<p className="text-muted-foreground text-xs">均分 −15 以下</p>
							</CardContent>
						</Card>
					</div>

					{/* 学生单科排名表 */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								{selectedSubject?.name ?? "科目"} — 学生成绩排名
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="max-h-80 overflow-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">排名</TableHead>
											<TableHead>姓名</TableHead>
											<TableHead className="text-right">分数</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{subjectStats.studentRanks.map((s) => (
											<TableRow key={s.studentId}>
												<TableCell className="text-muted-foreground text-xs">
													#{s.rank}
												</TableCell>
												<TableCell className="font-medium text-sm">
													{s.name}
												</TableCell>
												<TableCell className="text-right text-sm">
													{s.score == null ? "—" : s.score}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>

					{/* 低分学生列表 */}
					{subjectStats.lowScoreStudents.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-red-600 text-sm">
									低分学生（均分 −15 以下）
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-1">
									{subjectStats.lowScoreStudents.map((s) => (
										<div
											className="flex items-center justify-between rounded-none bg-red-50 px-3 py-1.5 dark:bg-red-950/20"
											key={s.studentId}
										>
											<span className="text-sm">{s.name}</span>
											<span className="font-medium text-red-600 text-sm">
												{s.score == null ? "—" : s.score}
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}
