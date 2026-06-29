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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@student-performance/ui/components/dialog";
import { Input } from "@student-performance/ui/components/input";
import { Label } from "@student-performance/ui/components/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@student-performance/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, ClipboardEdit, Plus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/exams/")({
	component: ExamsPage,
});

const EXAM_TYPES = ["期中考试", "期末考试", "月考", "模拟考", "其他"] as const;

const STATUS_LABEL: Record<string, string> = {
	draft: "草稿",
	recording: "录入中",
	published: "已发布",
};

const STATUS_COLOR: Record<string, string> = {
	draft: "text-muted-foreground",
	recording: "text-blue-600",
	published: "text-green-600",
};

interface SubjectEntry {
	fullScore: number;
	subjectId: number;
}

interface CreateFormState {
	classIds: number[];
	examDate: string;
	name: string;
	subjects: SubjectEntry[];
	type: string;
}

function ExamsPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();

	const [statusFilter, setStatusFilter] = useState<string | undefined>(
		undefined
	);
	const [createOpen, setCreateOpen] = useState(false);
	const [publishTarget, setPublishTarget] = useState<{
		id: number;
		name: string;
	} | null>(null);

	const [form, setForm] = useState<CreateFormState>({
		name: "",
		type: "期中考试",
		examDate: "",
		classIds: [],
		subjects: [],
	});

	const listOpts = trpc.exam.list.queryOptions({ status: statusFilter });
	const { data: examList = [], isLoading } = useQuery(listOpts);
	const { data: classList = [] } = useQuery(trpc.class.list.queryOptions());
	const { data: subjectList = [] } = useQuery(trpc.subject.list.queryOptions());

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: listOpts.queryKey });

	const createMut = useMutation(
		trpc.exam.create.mutationOptions({
			onSuccess: () => {
				toast.success("考试创建成功");
				setCreateOpen(false);
				resetForm();
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const publishMut = useMutation(
		trpc.exam.publish.mutationOptions({
			onSuccess: () => {
				toast.success("考试已发布，排名计算完成");
				setPublishTarget(null);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const resetForm = () =>
		setForm({
			name: "",
			type: "期中考试",
			examDate: "",
			classIds: [],
			subjects: [],
		});

	const toggleClass = (id: number) =>
		setForm((f) => ({
			...f,
			classIds: f.classIds.includes(id)
				? f.classIds.filter((c) => c !== id)
				: [...f.classIds, id],
		}));

	const toggleSubject = (id: number) =>
		setForm((f) => {
			if (f.subjects.some((s) => s.subjectId === id)) {
				return { ...f, subjects: f.subjects.filter((s) => s.subjectId !== id) };
			}
			return {
				...f,
				subjects: [...f.subjects, { subjectId: id, fullScore: 100 }],
			};
		});

	const setFullScore = (subjectId: number, value: number) =>
		setForm((f) => ({
			...f,
			subjects: f.subjects.map((s) =>
				s.subjectId === subjectId ? { ...s, fullScore: value } : s
			),
		}));

	const handleCreate = () => {
		if (!form.name.trim()) {
			toast.error("请填写考试名称");
			return;
		}
		if (!form.examDate) {
			toast.error("请选择考试日期");
			return;
		}
		if (form.classIds.length === 0) {
			toast.error("请至少选择一个班级");
			return;
		}
		if (form.subjects.length === 0) {
			toast.error("请至少选择一个科目");
			return;
		}
		createMut.mutate({
			name: form.name.trim(),
			type: form.type,
			examDate: form.examDate,
			classIds: form.classIds,
			subjects: form.subjects,
		});
	};

	const navigateToScoreEntry = (examId: number, classId: number) => {
		// Route created in T-006; cast required until file exists
		navigate({
			to: "/exams/score-entry" as never,
			search: { examId, classId } as never,
		});
	};

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">考试管理</h1>
				<Button
					onClick={() => {
						resetForm();
						setCreateOpen(true);
					}}
				>
					<Plus className="mr-1 h-4 w-4" />
					新建考试
				</Button>
			</div>

			<div className="mb-4 flex gap-2">
				{[undefined, "draft", "recording", "published"].map((s) => (
					<Button
						className="h-7 text-xs"
						key={s ?? "all"}
						onClick={() => setStatusFilter(s)}
						size="sm"
						variant={statusFilter === s ? "default" : "outline"}
					>
						{s ? STATUS_LABEL[s] : "全部"}
					</Button>
				))}
			</div>

			{isLoading ? (
				<div className="py-12 text-center text-muted-foreground">加载中…</div>
			) : (
				<div className="rounded-none border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>考试名称</TableHead>
								<TableHead>类型</TableHead>
								<TableHead>日期</TableHead>
								<TableHead>参与班级</TableHead>
								<TableHead>科目数</TableHead>
								<TableHead>状态</TableHead>
								<TableHead className="w-40 text-right">操作</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{examList.length === 0 ? (
								<TableRow>
									<TableCell
										className="py-12 text-center text-muted-foreground"
										colSpan={7}
									>
										暂无考试数据
									</TableCell>
								</TableRow>
							) : (
								examList.map((exam) => (
									<TableRow key={exam.id}>
										<TableCell className="font-medium">{exam.name}</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{exam.type}
										</TableCell>
										<TableCell className="text-xs">
											{new Date(exam.examDate).toLocaleDateString("zh-CN")}
										</TableCell>
										<TableCell className="text-xs">
											{exam.classNames.join("、") || "—"}
										</TableCell>
										<TableCell className="text-xs">
											{exam.subjectCount}
										</TableCell>
										<TableCell>
											<span
												className={`font-medium text-xs ${STATUS_COLOR[exam.status] ?? ""}`}
											>
												{STATUS_LABEL[exam.status] ?? exam.status}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												{exam.status !== "published" && (
													<>
														{exam.classNames.length === 1 ? (
															<Button
																onClick={() => {
																	const cls = classList.find(
																		(c) => c.name === exam.classNames[0]
																	);
																	if (cls) {
																		navigateToScoreEntry(exam.id, cls.id);
																	}
																}}
																size="icon-sm"
																title="录入成绩"
																variant="ghost"
															>
																<ClipboardEdit className="h-4 w-4" />
															</Button>
														) : (
															<select
																className="h-7 rounded-none border bg-background px-2 text-xs"
																onChange={(e) => {
																	if (e.target.value) {
																		navigateToScoreEntry(
																			exam.id,
																			Number(e.target.value)
																		);
																	}
																	e.target.value = "";
																}}
																title="选择班级录入"
															>
																<option value="">录入成绩…</option>
																{classList
																	.filter((c) =>
																		exam.classNames.includes(c.name)
																	)
																	.map((c) => (
																		<option key={c.id} value={c.id}>
																			{c.name}
																		</option>
																	))}
															</select>
														)}
														<Button
															onClick={() =>
																setPublishTarget({
																	id: exam.id,
																	name: exam.name,
																})
															}
															size="icon-sm"
															title="发布考试"
															variant="ghost"
														>
															<Send className="h-4 w-4 text-blue-600" />
														</Button>
													</>
												)}
												{exam.status === "published" && (
													<Button
														onClick={() => {
															const cls = classList.find(
																(c) => c.name === exam.classNames[0]
															);
															if (cls) {
																navigateToScoreEntry(exam.id, cls.id);
															}
														}}
														size="icon-sm"
														title="查看成绩"
														variant="ghost"
													>
														<BookOpen className="h-4 w-4" />
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Create exam dialog */}
			<Dialog
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) {
						resetForm();
					}
				}}
				open={createOpen}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>新建考试</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>考试名称 *</Label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, name: e.target.value }))
									}
									placeholder="如：2024年期末考试"
									value={form.name}
								/>
							</div>
							<div className="space-y-1">
								<Label>考试类型</Label>
								<select
									className="h-8 w-full rounded-none border bg-background px-2 text-xs"
									onChange={(e) =>
										setForm((f) => ({ ...f, type: e.target.value }))
									}
									value={form.type}
								>
									{EXAM_TYPES.map((t) => (
										<option key={t} value={t}>
											{t}
										</option>
									))}
								</select>
							</div>
						</div>
						<div className="space-y-1">
							<Label>考试日期 *</Label>
							<Input
								onChange={(e) =>
									setForm((f) => ({ ...f, examDate: e.target.value }))
								}
								type="date"
								value={form.examDate}
							/>
						</div>

						<div className="space-y-2">
							<Label>参与班级 *</Label>
							<div className="grid grid-cols-3 gap-2">
								{classList.map((cls) => (
									<label
										className="flex cursor-pointer items-center gap-2 text-xs"
										key={cls.id}
									>
										<input
											checked={form.classIds.includes(cls.id)}
											className="accent-primary"
											onChange={() => toggleClass(cls.id)}
											type="checkbox"
										/>
										{cls.name}
									</label>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<Label>参与科目与满分 *</Label>
							<div className="space-y-2">
								{subjectList.map((sub) => {
									const entry = form.subjects.find(
										(s) => s.subjectId === sub.id
									);
									return (
										<div className="flex items-center gap-3" key={sub.id}>
											<label className="flex w-24 cursor-pointer items-center gap-2 text-xs">
												<input
													checked={!!entry}
													className="accent-primary"
													onChange={() => toggleSubject(sub.id)}
													type="checkbox"
												/>
												{sub.name}
											</label>
											{entry && (
												<div className="flex items-center gap-1 text-xs">
													<span className="text-muted-foreground">满分</span>
													<Input
														className="h-7 w-20 text-xs"
														max={1000}
														min={1}
														onChange={(e) =>
															setFullScore(
																sub.id,
																Number.parseInt(e.target.value, 10) || 100
															)
														}
														type="number"
														value={entry.fullScore}
													/>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>

					<DialogFooter showCloseButton>
						<Button disabled={createMut.isPending} onClick={handleCreate}>
							{createMut.isPending ? "创建中…" : "创建考试"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Publish confirmation */}
			<AlertDialog
				onOpenChange={(open) => !open && setPublishTarget(null)}
				open={!!publishTarget}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认发布考试</AlertDialogTitle>
						<AlertDialogDescription>
							发布「{publishTarget?.name}
							」后，成绩将无法修改，系统将自动计算班级排名。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							disabled={publishMut.isPending}
							onClick={() =>
								publishTarget && publishMut.mutate({ id: publishTarget.id })
							}
						>
							{publishMut.isPending ? "发布中…" : "确认发布"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
