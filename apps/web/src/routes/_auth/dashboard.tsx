import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@student-performance/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, TrendingDown, TrendingUp, Users } from "lucide-react";
import { z } from "zod";

import { ScoreDistributionBar } from "@/components/charts/score-distribution-bar";
import { SubjectAvgBar } from "@/components/charts/subject-avg-bar";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
	validateSearch: z.object({
		classId: z.number().int().positive().optional(),
		examId: z.number().int().positive().optional(),
	}),
	component: DashboardPage,
});

const ALERT_TYPE_LABEL: Record<string, string> = {
	total_low: "总分低位",
	subject_weak: "单科薄弱",
	rank_declined: "排名退步",
};

function DashboardPage() {
	const { classId, examId } = Route.useSearch();
	const navigate = useNavigate();

	const { data: examList = [] } = useQuery(
		trpc.exam.list.queryOptions({ status: "published" })
	);
	const { data: classList = [] } = useQuery(trpc.class.list.queryOptions());

	const hasSelection = !!examId && !!classId;

	const { data: stats, isLoading: statsLoading } = useQuery({
		...trpc.analytics.classStats.queryOptions({
			examId: examId ?? 0,
			classId: classId ?? 0,
		}),
		enabled: hasSelection,
	});

	const { data: alerts = [] } = useQuery({
		...trpc.analytics.alerts.queryOptions({
			examId: examId ?? 0,
			classId: classId ?? 0,
		}),
		enabled: hasSelection,
	});

	const { data: rankChanges } = useQuery({
		...trpc.analytics.classRankChanges.queryOptions({
			examId: examId ?? 0,
			classId: classId ?? 0,
		}),
		enabled: hasSelection,
	});

	const selectedExam = examList.find((e) => e.id === examId);
	const selectedClass = classList.find((c) => c.id === classId);

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">数据看板</h1>
				<div className="flex items-center gap-3">
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								to: "/dashboard",
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
								to: "/dashboard",
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
				</div>
			</div>

			{!hasSelection && (
				<div className="py-16 text-center text-muted-foreground">
					请先选择考试和班级查看统计数据
				</div>
			)}

			{hasSelection && statsLoading && (
				<div className="py-16 text-center text-muted-foreground">加载中…</div>
			)}

			{hasSelection && stats && (
				<div className="space-y-6">
					{/* 标题 */}
					<p className="text-muted-foreground text-sm">
						{selectedExam?.name ?? "—"} · {selectedClass?.name ?? "—"} ·{" "}
						{stats.studentCount} 名学生
					</p>

					{/* 4 个统计卡片 */}
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
								<CardTitle className="font-medium text-sm">班级均分</CardTitle>
								<BarChart3 className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{stats.avgTotal.toFixed(1)}
								</p>
								{stats.prevExamAvg != null && (
									<p className="mt-0.5 text-muted-foreground text-xs">
										上次均分 {stats.prevExamAvg.toFixed(1)}（
										{stats.avgTotal >= stats.prevExamAvg ? "▲" : "▼"}
										{Math.abs(stats.avgTotal - stats.prevExamAvg).toFixed(1)}）
									</p>
								)}
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
								<CardTitle className="font-medium text-sm">及格率</CardTitle>
								<Users className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{(stats.passRate * 100).toFixed(1)}%
								</p>
								<p className="mt-0.5 text-muted-foreground text-xs">
									优秀率 {(stats.excellentRate * 100).toFixed(1)}%
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
								<CardTitle className="font-medium text-sm">
									最高 / 最低分
								</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{stats.maxTotal.toFixed(0)} / {stats.minTotal.toFixed(0)}
								</p>
								<p className="mt-0.5 text-muted-foreground text-xs">
									中位 {stats.medianTotal.toFixed(1)} · 标准差{" "}
									{stats.stddevTotal.toFixed(1)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
								<CardTitle className="font-medium text-sm">预警人数</CardTitle>
								<TrendingDown className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl text-orange-500">
									{alerts.length}
								</p>
								<p className="mt-0.5 text-muted-foreground text-xs">
									需重点关注的学生
								</p>
							</CardContent>
						</Card>
					</div>

					{/* 图表区域 */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">分数段分布</CardTitle>
							</CardHeader>
							<CardContent>
								<ScoreDistributionBar data={stats.distribution} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">科目均分对比</CardTitle>
							</CardHeader>
							<CardContent>
								<SubjectAvgBar data={stats.subjectAvgs} />
							</CardContent>
						</Card>
					</div>

					{/* 进退步 Top5 */}
					{rankChanges && (
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="text-green-600 text-sm">
										进步最多 Top5
									</CardTitle>
								</CardHeader>
								<CardContent>
									{rankChanges.top5improved.length === 0 ? (
										<p className="text-muted-foreground text-xs">
											暂无数据（需上次考试对比）
										</p>
									) : (
										<ul className="space-y-1">
											{rankChanges.top5improved.map((s) => (
												<li
													className="flex items-center justify-between text-sm"
													key={s.studentId}
												>
													<span>{s.name}</span>
													<span className="text-green-600">↑ {s.delta} 名</span>
												</li>
											))}
										</ul>
									)}
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="text-red-600 text-sm">
										退步最多 Top5
									</CardTitle>
								</CardHeader>
								<CardContent>
									{rankChanges.top5declined.length === 0 ? (
										<p className="text-muted-foreground text-xs">
											暂无数据（需上次考试对比）
										</p>
									) : (
										<ul className="space-y-1">
											{rankChanges.top5declined.map((s) => (
												<li
													className="flex items-center justify-between text-sm"
													key={s.studentId}
												>
													<span>{s.name}</span>
													<span className="text-red-600">
														↓ {Math.abs(s.delta)} 名
													</span>
												</li>
											))}
										</ul>
									)}
								</CardContent>
							</Card>
						</div>
					)}

					{/* 预警列表 */}
					{alerts.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">重点关注学生</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{alerts.map((a) => (
										<div
											className="flex items-center justify-between rounded-none border px-3 py-2"
											key={a.id}
										>
											<span className="font-medium text-sm">{a.name}</span>
											<span className="rounded-none bg-orange-100 px-2 py-0.5 text-orange-700 text-xs dark:bg-orange-950/30 dark:text-orange-400">
												{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}
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
