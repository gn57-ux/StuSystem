import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@student-performance/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { z } from "zod";

import { ScoreDistributionBar } from "@/components/charts/score-distribution-bar";
import { SubjectAvgBar } from "@/components/charts/subject-avg-bar";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/analytics/class")({
	validateSearch: z.object({
		classId: z.number().int().positive().optional(),
		examId: z.number().int().positive().optional(),
	}),
	component: ClassAnalyticsPage,
});

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

function ClassAnalyticsPage() {
	const { classId, examId } = Route.useSearch();
	const navigate = useNavigate();

	const { data: examList = [] } = useQuery(
		trpc.exam.list.queryOptions({ status: "published" })
	);
	const { data: classList = [] } = useQuery(trpc.class.list.queryOptions());

	const hasSelection = !!examId && !!classId;

	const { data: stats } = useQuery({
		...trpc.analytics.classStats.queryOptions({
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

	const pieData = stats
		? [
				{
					name: "优秀",
					value: Math.round(stats.excellentRate * stats.studentCount),
				},
				{
					name: "良好",
					value: Math.round(
						(stats.passRate - stats.excellentRate) * stats.studentCount
					),
				},
				{
					name: "及格",
					value: Math.round(
						(stats.passRate - stats.excellentRate) * stats.studentCount
					),
				},
				{
					name: "不及格",
					value: Math.round(stats.lowRate * stats.studentCount),
				},
			].filter((d) => d.value > 0)
		: [];

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">班级分析</h1>
				<div className="flex items-center gap-3">
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								to: "/analytics/class",
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
								to: "/analytics/class",
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
					请先选择考试和班级
				</div>
			)}

			{hasSelection && stats && (
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						{/* 优秀/及格率环形图 */}
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">成绩层次分布</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer height={180} width="100%">
									<PieChart>
										<Pie
											cx="50%"
											cy="50%"
											data={pieData}
											dataKey="value"
											innerRadius={50}
											outerRadius={75}
										>
											{pieData.map((entry, index) => (
												<Cell
													fill={PIE_COLORS[index % PIE_COLORS.length]}
													key={entry.name}
												/>
											))}
										</Pie>
										<Tooltip formatter={(v) => [`${v} 人`]} />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						{/* 分数段柱状图 */}
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">分数段分布</CardTitle>
							</CardHeader>
							<CardContent>
								<ScoreDistributionBar data={stats.distribution} />
							</CardContent>
						</Card>

						{/* 科目均分 */}
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">科目均分</CardTitle>
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
										<ul className="space-y-1.5">
											{rankChanges.top5improved.map((s, i) => (
												<li
													className="flex items-center justify-between text-sm"
													key={s.studentId}
												>
													<span className="font-medium text-muted-foreground text-xs">
														#{i + 1}
													</span>
													<span className="flex-1 px-2">{s.name}</span>
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
										<ul className="space-y-1.5">
											{rankChanges.top5declined.map((s, i) => (
												<li
													className="flex items-center justify-between text-sm"
													key={s.studentId}
												>
													<span className="font-medium text-muted-foreground text-xs">
														#{i + 1}
													</span>
													<span className="flex-1 px-2">{s.name}</span>
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
				</div>
			)}
		</div>
	);
}
