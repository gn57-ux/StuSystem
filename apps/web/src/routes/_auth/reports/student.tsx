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
import { Printer } from "lucide-react";
import { z } from "zod";

import { SubjectRadar } from "@/components/charts/subject-radar";
import { TrendLine } from "@/components/charts/trend-line";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/reports/student")({
	validateSearch: z.object({
		examId: z.number().int().positive().optional(),
		studentId: z.number().int().positive().optional(),
	}),
	component: StudentReportPage,
});

const ALERT_TYPE_LABEL: Record<string, string> = {
	rank_declined: "排名退步",
	subject_weak: "单科薄弱",
	total_low: "总分低位",
};

function StudentReportPage() {
	const { examId, studentId } = Route.useSearch();
	const navigate = useNavigate();

	const { data: studentListData } = useQuery(
		trpc.student.list.queryOptions({ pageSize: 100 })
	);
	const studentList = studentListData?.data ?? [];
	const { data: examList = [] } = useQuery(
		trpc.exam.list.queryOptions({ status: "published" })
	);

	const hasSelection = !!studentId;

	const { data: report, isLoading } = useQuery({
		...trpc.report.studentReport.queryOptions({
			examId,
			studentId: studentId ?? 0,
		}),
		enabled: hasSelection,
	});

	const { data: history } = useQuery({
		...trpc.student.getScoreHistory.queryOptions({
			studentId: studentId ?? 0,
		}),
		enabled: hasSelection,
	});

	const trendData = (history?.exams ?? []).map((e) => ({
		label: e.examName,
		value: e.total,
	}));

	const radarData = (report?.latestScores ?? []).map((s) => ({
		subject: s.subjectName,
		value: s.score,
	}));

	const selectedExam = examList.find((e) => e.id === examId);

	return (
		<div className="p-6">
			{/* 顶栏（打印时隐藏）*/}
			<div className="no-print mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">学生成绩报告</h1>
				<div className="flex items-center gap-3">
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								search: (prev) => ({
									...prev,
									studentId: e.target.value
										? Number(e.target.value)
										: undefined,
								}),
								to: "/reports/student",
							});
						}}
						value={studentId ?? ""}
					>
						<option value="">选择学生…</option>
						{studentList.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								search: (prev) => ({
									...prev,
									examId: e.target.value ? Number(e.target.value) : undefined,
								}),
								to: "/reports/student",
							});
						}}
						value={examId ?? ""}
					>
						<option value="">最新考试</option>
						{examList.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>
					<button
						className="flex items-center gap-1 rounded-none border px-3 py-1.5 text-sm hover:bg-muted"
						onClick={() => window.print()}
						type="button"
					>
						<Printer className="h-4 w-4" />
						打印报告
					</button>
				</div>
			</div>

			{!hasSelection && (
				<div className="py-16 text-center text-muted-foreground">
					请先选择学生
				</div>
			)}

			{hasSelection && isLoading && (
				<div className="py-16 text-center text-muted-foreground">加载中…</div>
			)}

			{hasSelection && report && (
				<div className="space-y-6">
					{/* 报告标题 */}
					<div className="border-b pb-4">
						<h2 className="font-bold text-xl">
							{report.student.name} · {selectedExam?.name ?? "最新考试"} ·
							成绩报告
						</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							生成日期：{new Date().toLocaleDateString("zh-CN")}　学号：
							{report.student.studentNo}
						</p>
					</div>

					{/* 基础信息 */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">基础信息</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm lg:grid-cols-4">
								<dt className="text-muted-foreground">姓名</dt>
								<dd className="font-medium">{report.student.name}</dd>
								<dt className="text-muted-foreground">学号</dt>
								<dd>{report.student.studentNo}</dd>
							</dl>
						</CardContent>
					</Card>

					{/* 最近考试成绩 */}
					{report.latestScores.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">本次考试各科成绩</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>科目</TableHead>
											<TableHead className="text-right">分数</TableHead>
											<TableHead className="text-right">班级均分</TableHead>
											<TableHead className="text-right">差值</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{report.latestScores.map((row) => {
											const diff = row.score - row.classAvg;
											const diffColor =
												diff >= 0 ? "text-green-600" : "text-red-500";
											return (
												<TableRow key={row.subjectId}>
													<TableCell className="text-sm">
														{row.subjectName}
													</TableCell>
													<TableCell className="text-right text-sm">
														{row.score}
													</TableCell>
													<TableCell className="text-right text-muted-foreground text-sm">
														{row.classAvg.toFixed(1)}
													</TableCell>
													<TableCell
														className={`text-right text-sm ${diffColor}`}
													>
														{diff >= 0
															? `+${diff.toFixed(1)}`
															: diff.toFixed(1)}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{/* 趋势图 + 雷达图 */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">历史总分趋势</CardTitle>
							</CardHeader>
							<CardContent>
								<TrendLine data={trendData} yAxisLabel="总分" />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">科目能力雷达</CardTitle>
							</CardHeader>
							<CardContent>
								<SubjectRadar data={radarData} />
							</CardContent>
						</Card>
					</div>

					{/* 预警摘要 */}
					{report.alerts.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">预警摘要</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-1">
									{report.alerts.map((a) => (
										<div className="flex items-center gap-2 text-sm" key={a.id}>
											<span className="rounded-none bg-orange-100 px-2 py-0.5 text-orange-700 text-xs dark:bg-orange-950/30 dark:text-orange-400">
												{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}
											</span>
											<span className="text-muted-foreground text-xs">
												考试 #{a.examId}
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* 教师备注（最近 3 条） */}
					{report.recentNotes.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">教师备注（最近 3 条）</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{report.recentNotes.map((note) => (
										<div className="text-sm" key={note.id}>
											<div className="flex items-center justify-between text-muted-foreground text-xs">
												<span>{note.authorName ?? "教师"}</span>
												<span>
													{new Date(note.createdAt).toLocaleDateString("zh-CN")}
												</span>
											</div>
											<p className="mt-0.5 whitespace-pre-wrap">
												{note.content}
											</p>
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
