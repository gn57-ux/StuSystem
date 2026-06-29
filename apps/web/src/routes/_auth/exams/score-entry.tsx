import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@student-performance/ui/components/alert-dialog";
import { Button } from "@student-performance/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	useBlocker,
	useNavigate,
} from "@tanstack/react-router";
import { Save, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
	getDirtyScores,
	ScoreEntryTable,
	type ScoreGrid,
} from "@/components/score-entry-table";
import { ScoreImportDialog } from "@/components/score-import-dialog";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/exams/score-entry")({
	validateSearch: z.object({
		examId: z.number().int().positive(),
		classId: z.number().int().positive(),
	}),
	component: ScoreEntryPage,
});

function ScoreEntryPage() {
	const { examId, classId } = Route.useSearch();
	const navigate = useNavigate();
	const qc = useQueryClient();

	const [grid, setGrid] = useState<ScoreGrid>(new Map());
	const [hasDirty, setHasDirty] = useState(false);
	const [publishOpen, setPublishOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const examOpts = trpc.exam.getById.queryOptions({ id: examId });
	const scoreOpts = trpc.score.listByExamClass.queryOptions({
		examId,
		classId,
	});

	const { data: examData, isLoading: examLoading } = useQuery(examOpts);
	const { data: scoreData, isLoading: scoreLoading } = useQuery(scoreOpts);

	const isPublished = scoreData?.examStatus === "published";

	const batchUpsertMut = useMutation(
		trpc.score.batchUpsert.mutationOptions({
			onSuccess: () => {
				toast.success("草稿已保存");
				setHasDirty(false);
				void qc.invalidateQueries({ queryKey: scoreOpts.queryKey });
			},
			onError: (e) => toast.error(`保存失败：${e.message}`),
		})
	);

	const publishMut = useMutation(
		trpc.exam.publish.mutationOptions({
			onSuccess: () => {
				toast.success("考试已发布，排名计算完成");
				setPublishOpen(false);
				setHasDirty(false);
				void qc.invalidateQueries({ queryKey: examOpts.queryKey });
				void qc.invalidateQueries({ queryKey: scoreOpts.queryKey });
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const handleGridChange = useCallback((newGrid: ScoreGrid) => {
		setGrid(newGrid);
		setHasDirty(true);
	}, []);

	const saveDraft = useCallback(() => {
		const dirty = getDirtyScores(grid);
		if (dirty.length === 0) {
			return;
		}
		batchUpsertMut.mutate({ examId, scores: dirty });
	}, [grid, examId, batchUpsertMut]);

	// Debounced auto-save (2s after last change)
	useEffect(() => {
		if (!hasDirty) {
			return;
		}
		if (saveTimerRef.current) {
			clearTimeout(saveTimerRef.current);
		}
		saveTimerRef.current = setTimeout(saveDraft, 2000);
		return () => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
			}
		};
	}, [hasDirty, saveDraft]);

	// Leave blocker
	const { proceed, reset, status } = useBlocker({
		condition: hasDirty && !isPublished,
	});

	if (examLoading || scoreLoading) {
		return (
			<div className="py-12 text-center text-muted-foreground">加载中…</div>
		);
	}

	if (!(examData && scoreData)) {
		return (
			<div className="py-12 text-center text-muted-foreground">
				考试或班级数据不存在
			</div>
		);
	}

	const className =
		examData.classes.find((c) => c.classId === classId)?.className ??
		`班级${classId}`;
	const subjects = scoreData.subjects.map((s) => ({
		id: s.subjectId,
		name: s.subjectName ?? "",
		fullScore: s.fullScore,
	}));
	const students = scoreData.students;
	const scores = scoreData.scores.map((s) => ({
		id: s.id,
		studentId: s.studentId,
		subjectId: s.subjectId,
		score: s.score ?? null,
		status: s.status,
	}));

	return (
		<div className="flex h-full flex-col">
			{/* Top bar */}
			<div className="flex flex-shrink-0 items-center justify-between border-b px-6 py-3">
				<div>
					<button
						className="mb-0.5 text-muted-foreground text-xs hover:text-foreground"
						onClick={() => navigate({ to: "/exams" })}
						type="button"
					>
						← 返回考试列表
					</button>
					<h1 className="font-semibold text-sm">
						{examData.name} · {className}
					</h1>
					<p className="text-muted-foreground text-xs">
						{new Date(examData.examDate).toLocaleDateString("zh-CN")} ·{" "}
						{students.length} 名学生 · {subjects.length} 个科目
						{isPublished && (
							<span className="ml-2 text-green-600">已发布（只读）</span>
						)}
					</p>
				</div>
				{!isPublished && (
					<div className="flex items-center gap-2">
						<Button
							onClick={() => setImportOpen(true)}
							size="sm"
							variant="outline"
						>
							<Upload className="mr-1 h-3.5 w-3.5" />
							CSV 导入
						</Button>
						<Button
							disabled={batchUpsertMut.isPending || !hasDirty}
							onClick={saveDraft}
							size="sm"
							variant="outline"
						>
							<Save className="mr-1 h-3.5 w-3.5" />
							{batchUpsertMut.isPending ? "保存中…" : "保存草稿"}
						</Button>
						<Button
							disabled={publishMut.isPending}
							onClick={() => setPublishOpen(true)}
							size="sm"
						>
							{publishMut.isPending ? "发布中…" : "提交发布"}
						</Button>
					</div>
				)}
			</div>

			{/* Score table */}
			<div className="flex-1 overflow-auto p-4">
				<ScoreEntryTable
					onGridChange={handleGridChange}
					readOnly={isPublished}
					scores={scores}
					students={students}
					subjects={subjects}
				/>
			</div>

			{/* Publish confirmation */}
			<AlertDialog onOpenChange={setPublishOpen} open={publishOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认提交发布</AlertDialogTitle>
						<AlertDialogDescription>
							发布后成绩将不可修改，系统将自动计算班级排名。请确认所有成绩已录入完整。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>继续录入</AlertDialogCancel>
						<AlertDialogAction
							disabled={publishMut.isPending}
							onClick={() => publishMut.mutate({ id: examId })}
						>
							确认发布
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* CSV score import */}
			<ScoreImportDialog
				classId={classId}
				examId={examId}
				onOpenChange={setImportOpen}
				onSuccess={() => {
					void qc.invalidateQueries({ queryKey: scoreOpts.queryKey });
				}}
				open={importOpen}
			/>

			{/* Leave guard */}
			<AlertDialog
				onOpenChange={(open) => !open && reset?.()}
				open={status === "blocked"}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>有未保存的成绩</AlertDialogTitle>
						<AlertDialogDescription>
							当前页面有未保存的成绩数据，离开后将丢失。确认离开？
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => reset?.()}>
							继续录入
						</AlertDialogCancel>
						<AlertDialogAction onClick={() => proceed?.()}>
							放弃更改并离开
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
