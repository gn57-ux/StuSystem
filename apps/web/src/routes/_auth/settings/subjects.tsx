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
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/settings/subjects")({
	component: SubjectsPage,
});

const SubjectSchema = z.object({
	name: z.string().min(1, "科目名称不能为空").max(100),
});

type SubjectRow = { id: number; name: string; createdAt: Date | string };

function SubjectsPage() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<SubjectRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<SubjectRow | null>(null);

	const qc = useQueryClient();
	const listOpts = trpc.subject.list.queryOptions();
	const { data: subjects = [], isLoading } = useQuery(listOpts);

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: listOpts.queryKey });

	const createMut = useMutation(
		trpc.subject.create.mutationOptions({
			onSuccess: () => {
				toast.success("科目创建成功");
				setDialogOpen(false);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const updateMut = useMutation(
		trpc.subject.update.mutationOptions({
			onSuccess: () => {
				toast.success("科目更新成功");
				setDialogOpen(false);
				setEditTarget(null);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const deleteMut = useMutation(
		trpc.subject.delete.mutationOptions({
			onSuccess: () => {
				toast.success("科目删除成功");
				setDeleteTarget(null);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const form = useForm({
		defaultValues: { name: "" },
		onSubmit: async ({ value }) => {
			if (editTarget) {
				updateMut.mutate({ id: editTarget.id, data: value });
			} else {
				createMut.mutate(value);
			}
		},
		validators: { onSubmit: SubjectSchema },
	});

	const openCreate = () => {
		form.reset();
		setEditTarget(null);
		setDialogOpen(true);
	};

	const openEdit = (row: SubjectRow) => {
		form.reset({ name: row.name });
		setEditTarget(row);
		setDialogOpen(true);
	};

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">科目管理</h1>
				<Button onClick={openCreate}>
					<Plus className="mr-1 h-4 w-4" />
					新增科目
				</Button>
			</div>

			{isLoading ? (
				<div className="py-12 text-center text-muted-foreground">加载中…</div>
			) : (
				<div className="rounded-none border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>科目名称</TableHead>
								<TableHead>创建时间</TableHead>
								<TableHead className="w-24 text-right">操作</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{subjects.length === 0 ? (
								<TableRow>
									<TableCell
										className="py-12 text-center text-muted-foreground"
										colSpan={3}
									>
										暂无科目数据
									</TableCell>
								</TableRow>
							) : (
								subjects.map((sub) => (
									<TableRow key={sub.id}>
										<TableCell className="font-medium">{sub.name}</TableCell>
										<TableCell>
											{new Date(sub.createdAt).toLocaleDateString("zh-CN")}
										</TableCell>
										<TableCell className="text-right">
											<Button
												onClick={() => openEdit(sub)}
												size="icon-sm"
												variant="ghost"
											>
												<Pencil className="h-4 w-4" />
												<span className="sr-only">编辑</span>
											</Button>
											<Button
												onClick={() => setDeleteTarget(sub)}
												size="icon-sm"
												variant="ghost"
											>
												<Trash2 className="h-4 w-4 text-destructive" />
												<span className="sr-only">删除</span>
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			<Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{editTarget ? "编辑科目" : "新增科目"}</DialogTitle>
					</DialogHeader>
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							void form.handleSubmit();
						}}
					>
						<form.Field name="name">
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor={field.name}>科目名称 *</Label>
									<Input
										id={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="如：语文、数学"
										value={field.state.value}
									/>
									{field.state.meta.errors.map((err) => (
										<p className="text-destructive text-xs" key={String(err)}>
											{String(err)}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<DialogFooter showCloseButton>
							<form.Subscribe
								selector={(s) => ({
									canSubmit: s.canSubmit,
									isSubmitting: s.isSubmitting,
								})}
							>
								{({ canSubmit, isSubmitting }) => (
									<Button disabled={!canSubmit || isSubmitting} type="submit">
										{isSubmitting ? "保存中…" : "保存"}
									</Button>
								)}
							</form.Subscribe>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				open={!!deleteTarget}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除科目</AlertDialogTitle>
						<AlertDialogDescription>
							删除「{deleteTarget?.name}
							」后无法恢复。科目已关联考试时不允许删除。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleteMut.isPending}
							onClick={() =>
								deleteTarget && deleteMut.mutate({ id: deleteTarget.id })
							}
							variant="destructive"
						>
							{deleteMut.isPending ? "删除中…" : "删除"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
