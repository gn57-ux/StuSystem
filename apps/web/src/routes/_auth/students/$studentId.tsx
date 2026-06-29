// biome-ignore lint/style/useFilenamingConvention: TanStack Router dynamic route segment

import { Badge } from "@student-performance/ui/components/badge";
import { Button } from "@student-performance/ui/components/button";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SubjectRadar } from "@/components/charts/subject-radar";
import { TrendLine } from "@/components/charts/trend-line";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/students/$studentId")({
	component: StudentDetailPage,
});

const GENDER_LABEL: Record<string, string> = {
	female: "女",
	male: "男",
	unset: "未填",
};

const STATUS_LABEL: Record<string, string> = {
	active: "在读",
	leave: "休学",
	transfer: "转学",
};

function rankDeltaText(delta: number): string {
	if (delta > 0) {
		return `↑${delta}`;
	}
	if (delta < 0) {
		return `↓${Math.abs(delta)}`;
	}
	return "→";
}

function rankDeltaColor(delta: number): string {
	if (delta > 0) {
		return "text-green-600";
	}
	if (delta < 0) {
		return "text-red-500";
	}
	return "text-muted-foreground";
}

interface ScoreRow {
	classAvg: number;
	fullScore: number;
	score: number;
	subjectId: number;
	subjectName: string;
}

function ScoresCardContent({
	loading,
	rows,
}: {
	loading: boolean;
	rows: ScoreRow[];
}) {
	if (loading) {
		return <p className="text-muted-foreground text-sm">加载中…</p>;
	}
	if (!rows.length) {
		return <p className="text-muted-foreground text-sm">暂无成绩数据</p>;
	}
	return <SubjectScoreTable rows={rows} />;
}

function SubjectScoreTable({ rows }: { rows: ScoreRow[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>科目</TableHead>
					<TableHead className="text-right">分数</TableHead>
					<TableHead className="text-right">满分</TableHead>
					<TableHead className="text-right">班级均分</TableHead>
					<TableHead className="text-right">差值</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => {
					const diff = row.score - row.classAvg;
					const diffText = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
					const diffColor = diff >= 0 ? "text-green-600" : "text-red-500";
					return (
						<TableRow key={row.subjectId}>
							<TableCell className="font-medium text-sm">
								{row.subjectName}
							</TableCell>
							<TableCell className="text-right text-sm">{row.score}</TableCell>
							<TableCell className="text-right text-muted-foreground text-sm">
								{row.fullScore}
							</TableCell>
							<TableCell className="text-right text-muted-foreground text-sm">
								{row.classAvg.toFixed(1)}
							</TableCell>
							<TableCell
								className={`text-right font-medium text-sm ${diffColor}`}
							>
								{diffText}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

type ChartTab = "rank" | "subject" | "total";
const CHART_TABS: { label: string; value: ChartTab }[] = [
	{ label: "总分趋势", value: "total" },
	{ label: "单科趋势", value: "subject" },
	{ label: "排名变化", value: "rank" },
];

interface TrendPoint {
	label: string;
	value: number;
}

interface ChartSectionProps {
	exams: {
		examDate: string;
		examName: string;
		rankInClass: number | null;
		total: number;
	}[];
	radarData: { subject: string; value: number }[];
	studentId: number;
	subjectOptions: { subjectId: number; subjectName: string }[];
}

function ChartSection({
	exams,
	radarData,
	studentId,
	subjectOptions,
}: ChartSectionProps) {
	const [activeTab, setActiveTab] = useState<ChartTab>("total");
	const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
		null
	);

	const subjectId = selectedSubjectId ?? subjectOptions[0]?.subjectId;

	const { data: subjectHistory } = useQuery({
		...trpc.student.getSubjectHistory.queryOptions({
			studentId,
			subjectId: subjectId ?? 0,
		}),
		enabled: activeTab === "subject" && !!subjectId,
	});

	const totalTrendData: TrendPoint[] = exams.map((e) => ({
		label: e.examName,
		value: e.total,
	}));
	const rankTrendData: TrendPoint[] = exams
		.filter((e) => e.rankInClass != null)
		.map((e) => ({ label: e.examName, value: e.rankInClass as number }));
	const subjectTrendData: TrendPoint[] = (subjectHistory?.exams ?? [])
		.filter((e) => e.score != null)
		.map((e) => ({ label: e.examName, value: e.score as number }));

	return (
		<>
			<Card className="mt-4">
				<CardHeader>
					<div className="flex items-center gap-2">
						{CHART_TABS.map((tab) => (
							<button
								className={`rounded-none px-3 py-1 text-sm transition-colors ${
									activeTab === tab.value
										? "bg-primary text-primary-foreground"
										: "hover:bg-muted"
								}`}
								key={tab.value}
								onClick={() => setActiveTab(tab.value)}
								type="button"
							>
								{tab.label}
							</button>
						))}
						{activeTab === "subject" && (
							<select
								className="ml-auto h-7 rounded-none border bg-background px-2 text-xs"
								onChange={(e) =>
									setSelectedSubjectId(
										e.target.value ? Number(e.target.value) : null
									)
								}
								value={subjectId ?? ""}
							>
								{subjectOptions.map((s) => (
									<option key={s.subjectId} value={s.subjectId}>
										{s.subjectName}
									</option>
								))}
							</select>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{activeTab === "total" && (
						<TrendLine data={totalTrendData} yAxisLabel="总分" />
					)}
					{activeTab === "subject" && (
						<TrendLine data={subjectTrendData} yAxisLabel="分数" />
					)}
					{activeTab === "rank" && (
						<TrendLine
							color="#f59e0b"
							data={rankTrendData}
							reversed
							yAxisLabel="排名"
						/>
					)}
				</CardContent>
			</Card>

			<Card className="mt-4">
				<CardHeader>
					<CardTitle className="text-base">科目能力雷达（标准化分）</CardTitle>
				</CardHeader>
				<CardContent>
					<SubjectRadar data={radarData} />
				</CardContent>
			</Card>
		</>
	);
}

function StudentDetailPage() {
	const { studentId: studentIdStr } = Route.useParams();
	const studentId = Number(studentIdStr);

	const { data: student, isLoading: studentLoading } = useQuery(
		trpc.student.getOne.queryOptions({ id: studentId })
	);

	const { data: latestScores, isLoading: scoresLoading } = useQuery(
		trpc.student.getLatestSubjectScores.queryOptions({ studentId })
	);

	const { data: history } = useQuery(
		trpc.student.getScoreHistory.queryOptions({ studentId })
	);

	if (studentLoading) {
		return <div className="p-6 text-center text-muted-foreground">加载中…</div>;
	}

	if (!student) {
		return (
			<div className="p-6 text-center text-muted-foreground">学生不存在</div>
		);
	}

	const exams = history?.exams ?? [];
	const latestExam = exams[exams.length - 1];
	const prevExam = exams.length >= 2 ? exams[exams.length - 2] : null;

	const rankDelta =
		latestExam?.rankInClass != null && prevExam?.rankInClass != null
			? prevExam.rankInClass - latestExam.rankInClass
			: null;

	const radarData = (latestScores?.scores ?? []).map((s) => ({
		subject: s.subjectName,
		value: s.normalizedScore,
	}));

	return (
		<div className="p-6">
			<div className="mb-4 text-muted-foreground text-sm">
				<Link className="hover:underline" to="/students">
					学生管理
				</Link>
				<span className="mx-1">/</span>
				<span>{student.name}</span>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">基础信息</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<dt className="text-muted-foreground">姓名</dt>
							<dd className="font-medium">{student.name}</dd>
							<dt className="text-muted-foreground">学号</dt>
							<dd>{student.studentNo}</dd>
							<dt className="text-muted-foreground">班级</dt>
							<dd>{student.className ?? "—"}</dd>
							<dt className="text-muted-foreground">性别</dt>
							<dd>{GENDER_LABEL[student.gender ?? "unset"] ?? "—"}</dd>
							<dt className="text-muted-foreground">入学年份</dt>
							<dd>{student.enrollYear ?? "—"}</dd>
							<dt className="text-muted-foreground">状态</dt>
							<dd>
								{STATUS_LABEL[student.status ?? "active"] ?? student.status}
							</dd>
							{student.contact && (
								<>
									<dt className="text-muted-foreground">联系方式</dt>
									<dd>{student.contact}</dd>
								</>
							)}
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">最近考试排名</CardTitle>
					</CardHeader>
					<CardContent>
						{latestExam ? (
							<RankSummary
								biasScore={latestScores?.biasScore}
								examDate={latestExam.examDate}
								examName={latestExam.examName}
								rankDelta={rankDelta}
								rankInClass={latestExam.rankInClass}
								total={latestExam.total}
							/>
						) : (
							<p className="text-muted-foreground text-sm">
								暂无已发布考试数据
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card className="mt-4">
				<CardHeader>
					<CardTitle className="text-base">
						最近考试各科成绩
						{latestScores?.examId && (
							<span className="ml-2 font-normal text-muted-foreground text-sm">
								{latestExam?.examName}
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ScoresCardContent
						loading={scoresLoading}
						rows={latestScores?.scores ?? []}
					/>
				</CardContent>
			</Card>

			<ChartSection
				exams={exams}
				radarData={radarData}
				studentId={studentId}
				subjectOptions={latestScores?.scores ?? []}
			/>

			<AlertsSection studentId={studentId} />

			<TeacherNotesSection studentId={studentId} />
		</div>
	);
}

const ALERT_TYPE_LABEL: Record<string, string> = {
	rank_declined: "排名退步",
	subject_weak: "单科薄弱",
	total_low: "总分低位",
};

function AlertsSection({ studentId }: { studentId: number }) {
	const qc = useQueryClient();

	const { data: alerts = [] } = useQuery(
		trpc.analytics.studentAlerts.queryOptions({ studentId })
	);

	const resolveMut = useMutation(
		trpc.analytics.resolveAlert.mutationOptions({
			onError: () => toast.error("操作失败，请重试"),
			onSuccess: () => {
				void qc.invalidateQueries(
					trpc.analytics.studentAlerts.queryFilter({ studentId })
				);
			},
		})
	);

	if (alerts.length === 0) {
		return null;
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle className="text-base">预警记录</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{alerts.map((a) => (
						<div
							className="flex items-center justify-between rounded-none border px-3 py-2"
							key={a.id}
						>
							<div className="flex items-center gap-2">
								<Badge variant="secondary">
									{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}
								</Badge>
								<span className="text-muted-foreground text-xs">
									考试 #{a.examId}
								</span>
							</div>
							<div className="flex gap-2">
								<Button
									disabled={resolveMut.isPending}
									onClick={() =>
										resolveMut.mutate({ alertId: a.id, status: "confirmed" })
									}
									size="sm"
									variant="outline"
								>
									确认
								</Button>
								<Button
									disabled={resolveMut.isPending}
									onClick={() =>
										resolveMut.mutate({ alertId: a.id, status: "ignored" })
									}
									size="sm"
									variant="ghost"
								>
									忽略
								</Button>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TeacherNotesSection({ studentId }: { studentId: number }) {
	const qc = useQueryClient();
	const [content, setContent] = useState("");

	const { data: notes = [] } = useQuery(
		trpc.note.list.queryOptions({ studentId })
	);

	const createMut = useMutation(
		trpc.note.create.mutationOptions({
			onError: () => toast.error("备注提交失败"),
			onMutate: async (input) => {
				await qc.cancelQueries(trpc.note.list.queryFilter({ studentId }));
				const prev = qc.getQueryData(
					trpc.note.list.queryOptions({ studentId }).queryKey
				);
				qc.setQueryData(
					trpc.note.list.queryOptions({ studentId }).queryKey,
					(old) => [
						{
							authorName: "（发送中…）" as string | null,
							content: input.content,
							createdAt: new Date().toISOString(),
							id: -Date.now(),
							studentId,
						},
						...(old ?? []),
					]
				);
				return { prev };
			},
			onSettled: () => {
				void qc.invalidateQueries(trpc.note.list.queryFilter({ studentId }));
			},
		})
	);

	const handleSubmit = () => {
		if (!content.trim()) {
			return;
		}
		createMut.mutate({ content: content.trim(), studentId });
		setContent("");
	};

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle className="text-base">教师备注</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 添加备注 */}
				<div className="space-y-2">
					<textarea
						className="w-full rounded-none border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						onChange={(e) => setContent(e.target.value)}
						placeholder="添加备注…"
						rows={3}
						value={content}
					/>
					<Button
						disabled={!content.trim() || createMut.isPending}
						onClick={handleSubmit}
						size="sm"
					>
						提交备注
					</Button>
				</div>

				{/* 备注列表 */}
				{notes.length > 0 && (
					<div className="space-y-2 border-t pt-3">
						{notes.map((note) => (
							<div className="text-sm" key={note.id}>
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>{note.authorName ?? "教师"}</span>
									<span>
										{new Date(note.createdAt).toLocaleString("zh-CN", {
											dateStyle: "short",
											timeStyle: "short",
										})}
									</span>
								</div>
								<p className="mt-0.5 whitespace-pre-wrap">{note.content}</p>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface RankSummaryProps {
	biasScore: number | undefined;
	examDate: string;
	examName: string;
	rankDelta: number | null;
	rankInClass: number | null;
	total: number;
}

function RankSummary({
	biasScore,
	examDate,
	examName,
	rankDelta,
	rankInClass,
	total,
}: RankSummaryProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-sm">{examName}</span>
				<span className="text-muted-foreground text-xs">{examDate}</span>
			</div>
			<div className="flex items-end gap-4">
				<div>
					<p className="text-muted-foreground text-xs">总分</p>
					<p className="font-bold text-2xl">{total.toFixed(0)}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">班级排名</p>
					<p className="font-bold text-2xl">
						{rankInClass == null ? "—" : `#${rankInClass}`}
					</p>
				</div>
				{rankDelta !== null && (
					<div>
						<p className="text-muted-foreground text-xs">名次变化</p>
						<p className={`font-bold text-lg ${rankDeltaColor(rankDelta)}`}>
							{rankDeltaText(rankDelta)}
						</p>
					</div>
				)}
			</div>
			{biasScore !== undefined && biasScore > 30 && (
				<p className="rounded-none bg-orange-50 px-2 py-1 text-orange-700 text-xs dark:bg-orange-950/20 dark:text-orange-400">
					偏科较明显（偏科度 {biasScore.toFixed(0)}）
				</p>
			)}
		</div>
	);
}
