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
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { SubjectAvgBar } from "@/components/charts/subject-avg-bar";
import { downloadCsv } from "@/utils/export-csv";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/reports/class")({
	validateSearch: z.object({
		classId: z.number().int().positive().optional(),
		examId: z.number().int().positive().optional(),
	}),
	component: ClassReportPage,
});

const ALERT_TYPE_LABEL: Record<string, string> = {
	rank_declined: "排名退步",
	subject_weak: "单科薄弱",
	total_low: "总分低位",
};

function ClassReportPage() {
	const { classId, examId } = Route.useSearch();
	const navigate = useNavigate();
	const commentRef = useRef<HTMLTextAreaElement>(null);

	const { data: examList = [] } = useQuery(
		trpc.exam.list.queryOptions({ status: "published" })
	);
	const { data: classList = [] } = useQuery(trpc.class.list.queryOptions());
	const { refetch: refetchExport } = useQuery({
		...trpc.report.exportScores.queryOptions({
			classId: classId ?? 0,
			examId: examId ?? 0,
		}),
		enabled: false,
	});

	const hasSelection = !!examId && !!classId;

	const { data: report, isLoading } = useQuery({
		...trpc.report.classReport.queryOptions({
			classId: classId ?? 0,
			examId: examId ?? 0,
		}),
		enabled: hasSelection,
	});

	const saveCommentMut = useMutation(
		trpc.report.saveComment.mutationOptions({
			onError: () => toast.error("评语保存失败"),
			onSuccess: () => toast.success("评语已保存"),
		})
	);

	const selectedExam = examList.find((e) => e.id === examId);
	const selectedClass = classList.find((c) => c.id === classId);

	const handleExportCsv = async () => {
		const result = await refetchExport();
		if (result.data) {
			const filename = `成绩_${selectedClass?.name ?? "班级"}_${selectedExam?.name ?? "考试"}.csv`;
			downloadCsv(result.data.rows, filename);
		}
	};

	const handleCommentBlur = () => {
		if (!(examId && classId && commentRef.current)) {
			return;
		}
		saveCommentMut.mutate({
			classId,
			content: commentRef.current.value,
			examId,
		});
	};

	const subjectAvgsData = (report?.subjectAvgs ?? []).map((s) => ({
		avg: s.avg,
		subjectId: s.subjectId,
		subjectName: s.subjectName,
	}));

	return (
		<div className="p-6">
			{/* 顶栏（打印时隐藏） */}
			<div className="no-print mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">班级成绩报告</h1>
				<div className="flex items-center gap-3">
					<select
						className="h-8 rounded-none border bg-background px-2 text-sm"
						onChange={(e) => {
							navigate({
								search: (prev) => ({
									...prev,
									examId: e.target.value ? Number(e.target.value) : undefined,
								}),
								to: "/reports/class",
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
								search: (prev) => ({
									...prev,
									classId: e.target.value ? Number(e.target.value) : undefined,
								}),
								to: "/reports/class",
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
					{hasSelection && (
						<button
							className="rounded-none border px-3 py-1.5 text-sm hover:bg-muted"
							onClick={handleExportCsv}
							type="button"
						>
							导出成绩 CSV
						</button>
					)}
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
					请先选择考试和班级
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
							{selectedClass?.name} · {selectedExam?.name} · 成绩分析报告
						</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							生成日期：{new Date().toLocaleDateString("zh-CN")}　共{" "}
							{report.studentCount} 名学生
						</p>
					</div>

					{/* 指标卡片 */}
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">均分</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{report.avgTotal.toFixed(1)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">最高分</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{report.maxTotal.toFixed(0)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">最低分</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl">
									{report.minTotal.toFixed(0)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-1">
								<CardTitle className="font-medium text-sm">预警人数</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="font-bold text-2xl text-orange-500">
									{report.alerts.length}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* 科目均分图 */}
					{subjectAvgsData.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">科目均分对比</CardTitle>
							</CardHeader>
							<CardContent>
								<SubjectAvgBar data={subjectAvgsData} />
							</CardContent>
						</Card>
					)}

					{/* 重点关注学生 */}
					{report.alerts.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">重点关注学生</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>姓名</TableHead>
											<TableHead>预警类型</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{report.alerts.map((a) => (
											<TableRow key={a.id}>
												<TableCell className="text-sm">
													{a.studentName ?? "—"}
												</TableCell>
												<TableCell className="text-sm">
													{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{/* 教师评语 */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">教师评语</CardTitle>
						</CardHeader>
						<CardContent>
							<textarea
								className="no-print w-full rounded-none border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								defaultValue={report.comment}
								key={`${examId}-${classId}`}
								onBlur={handleCommentBlur}
								placeholder="添加班级评语（失焦后自动保存）…"
								ref={commentRef}
								rows={4}
							/>
							{/* 打印时显示 */}
							{report.comment && (
								<p className="print-only hidden whitespace-pre-wrap text-sm">
									{report.comment}
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
