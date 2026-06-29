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
import { ChevronLeft, ChevronRight, Pencil, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { StudentImportDialog } from "@/components/student-import-dialog";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/students/")({
	component: StudentsPage,
});

const PAGE_SIZE = 20;

const GENDER_LABEL: Record<string, string> = {
	male: "男",
	female: "女",
	unset: "—",
};
const STATUS_LABEL: Record<string, string> = {
	active: "在校",
	leave: "休学",
	transfer: "转学",
};

// Use z.union([z.number(), z.undefined()]) instead of .optional() so that the StandardSchema
// input type is `number | undefined` (required key) not `number?` (optional key),
// matching the form state inferred from defaultValues.
const enrollYearField = z.union([
	z.number().int().min(2000, "入学年份不合法").max(2100, "入学年份不合法"),
	z.undefined(),
]);

const StudentCreateSchema = z.object({
	studentNo: z.string().min(1, "学号不能为空").max(50),
	name: z.string().min(1, "姓名不能为空").max(100),
	gender: z.enum(["male", "female", "unset"]),
	classId: z.number({ message: "请选择班级" }).int().positive("请选择班级"),
	enrollYear: enrollYearField,
	status: z.enum(["active", "leave", "transfer"]),
	contact: z.string().max(100),
});

const StudentUpdateSchema = z.object({
	name: z.string().min(1, "姓名不能为空").max(100),
	gender: z.enum(["male", "female", "unset"]),
	enrollYear: enrollYearField,
	status: z.enum(["active", "leave", "transfer"]),
	contact: z.string().max(100),
});

type StudentRow = {
	id: number;
	studentNo: string;
	name: string;
	gender: string | null;
	classId: number;
	className: string | null;
	status: string;
	enrollYear: number | null;
};

type CreateFormValues = {
	studentNo: string;
	name: string;
	gender: "male" | "female" | "unset";
	classId: number;
	enrollYear: number | undefined;
	status: "active" | "leave" | "transfer";
	contact: string;
};

type UpdateFormValues = {
	name: string;
	gender: "male" | "female" | "unset";
	enrollYear: number | undefined;
	status: "active" | "leave" | "transfer";
	contact: string;
};

function StudentsPage() {
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [classFilter, setClassFilter] = useState<number | undefined>(undefined);
	const [page, setPage] = useState(1);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<StudentRow | null>(null);
	const [statusTarget, setStatusTarget] = useState<StudentRow | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput);
			setPage(1);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const qc = useQueryClient();
	const listOpts = trpc.student.list.queryOptions({
		page,
		pageSize: PAGE_SIZE,
		classId: classFilter,
		search: search || undefined,
	});

	const { data, isLoading } = useQuery({
		...listOpts,
		placeholderData: (prev) => prev,
	});
	const { data: classList = [] } = useQuery(trpc.class.list.queryOptions());

	const students = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: listOpts.queryKey });

	const createMut = useMutation(
		trpc.student.create.mutationOptions({
			onSuccess: () => {
				toast.success("学生创建成功");
				setDialogOpen(false);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const updateMut = useMutation(
		trpc.student.update.mutationOptions({
			onSuccess: () => {
				toast.success("学生信息更新成功");
				setDialogOpen(false);
				setEditTarget(null);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const updateStatusMut = useMutation(
		trpc.student.updateStatus.mutationOptions({
			onSuccess: () => {
				toast.success("状态更新成功");
				setStatusTarget(null);
				void invalidate();
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const createForm = useForm({
		defaultValues: {
			studentNo: "",
			name: "",
			gender: "unset" as "male" | "female" | "unset",
			classId: 0,
			enrollYear: undefined as number | undefined,
			status: "active" as "active" | "leave" | "transfer",
			contact: "",
		},
		onSubmit: async ({ value }) => {
			createMut.mutate({
				studentNo: value.studentNo,
				name: value.name,
				gender: value.gender === "unset" ? undefined : value.gender,
				classId: value.classId,
				enrollYear: value.enrollYear,
				status: value.status,
				contact: value.contact || undefined,
			});
		},
		validators: { onSubmit: StudentCreateSchema },
	});

	const editForm = useForm({
		defaultValues: {
			name: "",
			gender: "unset" as "male" | "female" | "unset",
			enrollYear: undefined as number | undefined,
			status: "active" as "active" | "leave" | "transfer",
			contact: "",
		},
		onSubmit: async ({ value }) => {
			if (!editTarget) {
				return;
			}
			updateMut.mutate({
				id: editTarget.id,
				data: {
					name: value.name,
					gender: value.gender === "unset" ? undefined : value.gender,
					enrollYear: value.enrollYear,
					status: value.status,
					contact: value.contact || undefined,
				},
			});
		},
		validators: { onSubmit: StudentUpdateSchema },
	});

	const openCreate = () => {
		createForm.reset({
			studentNo: "",
			name: "",
			gender: "unset",
			classId: classFilter ?? 0,
			enrollYear: undefined,
			status: "active",
			contact: "",
		});
		setEditTarget(null);
		setDialogOpen(true);
	};

	const openEdit = (row: StudentRow) => {
		editForm.reset({
			name: row.name,
			gender: (row.gender as "male" | "female" | "unset") ?? "unset",
			enrollYear: row.enrollYear ?? undefined,
			status: (row.status as "active" | "leave" | "transfer") ?? "active",
			contact: "",
		});
		setEditTarget(row);
		setDialogOpen(true);
	};

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">学生管理</h1>
				<div className="flex gap-2">
					<Button
						onClick={() => setImportOpen(true)}
						size="sm"
						variant="outline"
					>
						<Upload className="mr-1 h-4 w-4" />
						导入学生
					</Button>
					<Button onClick={openCreate} size="sm">
						<Plus className="mr-1 h-4 w-4" />
						新增学生
					</Button>
				</div>
			</div>

			<div className="mb-4 flex items-center gap-3">
				<select
					className="h-8 rounded-none border bg-background px-2 text-xs"
					onChange={(e) => {
						setClassFilter(e.target.value ? Number(e.target.value) : undefined);
						setPage(1);
					}}
					value={classFilter ?? ""}
				>
					<option value="">全部班级</option>
					{classList.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>

				<Input
					className="h-8 w-56"
					onChange={(e) => setSearchInput(e.target.value)}
					placeholder="搜索姓名或学号…"
					value={searchInput}
				/>

				<span className="ml-auto text-muted-foreground text-xs">
					共 {total} 名学生
				</span>
			</div>

			{isLoading && !data ? (
				<div className="py-12 text-center text-muted-foreground">加载中…</div>
			) : (
				<>
					<div className="rounded-none border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>学号</TableHead>
									<TableHead>姓名</TableHead>
									<TableHead>班级</TableHead>
									<TableHead>性别</TableHead>
									<TableHead>入学年份</TableHead>
									<TableHead>状态</TableHead>
									<TableHead className="w-20 text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{students.length === 0 ? (
									<TableRow>
										<TableCell
											className="py-12 text-center text-muted-foreground"
											colSpan={7}
										>
											{search || classFilter
												? "未找到匹配的学生"
												: "暂无学生数据"}
										</TableCell>
									</TableRow>
								) : (
									students.map((stu) => (
										<TableRow key={stu.id}>
											<TableCell className="font-mono text-xs">
												{stu.studentNo}
											</TableCell>
											<TableCell className="font-medium">{stu.name}</TableCell>
											<TableCell>{stu.className ?? "—"}</TableCell>
											<TableCell>
												{GENDER_LABEL[stu.gender ?? "unset"] ?? "—"}
											</TableCell>
											<TableCell>{stu.enrollYear ?? "—"}</TableCell>
											<TableCell>
												<span
													className={
														stu.status === "active"
															? "text-green-600"
															: stu.status === "leave"
																? "text-yellow-600"
																: "text-muted-foreground"
													}
												>
													{STATUS_LABEL[stu.status] ?? stu.status}
												</span>
											</TableCell>
											<TableCell className="text-right">
												<Button
													onClick={() => openEdit(stu)}
													size="icon-sm"
													variant="ghost"
												>
													<Pencil className="h-4 w-4" />
													<span className="sr-only">编辑</span>
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{totalPages > 1 && (
						<div className="mt-3 flex items-center justify-end gap-2">
							<Button
								disabled={page <= 1}
								onClick={() => setPage((p) => p - 1)}
								size="icon-sm"
								variant="outline"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="text-muted-foreground text-xs">
								{page} / {totalPages}
							</span>
							<Button
								disabled={page >= totalPages}
								onClick={() => setPage((p) => p + 1)}
								size="icon-sm"
								variant="outline"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					)}
				</>
			)}

			{/* Create / Edit Dialog */}
			<Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{editTarget ? "编辑学生" : "新增学生"}</DialogTitle>
					</DialogHeader>

					{editTarget ? (
						<form
							className="space-y-3"
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void editForm.handleSubmit();
							}}
						>
							<editForm.Field name="name">
								{(field) => (
									<div className="space-y-1">
										<Label htmlFor={field.name}>姓名 *</Label>
										<Input
											id={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										/>
										{field.state.meta.errors.map((err) => (
											<p className="text-destructive text-xs" key={String(err)}>
												{String(err)}
											</p>
										))}
									</div>
								)}
							</editForm.Field>

							<div className="grid grid-cols-2 gap-3">
								<editForm.Field name="gender">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>性别</Label>
											<select
												className="h-8 w-full rounded-none border bg-background px-2 text-xs"
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value as "male" | "female" | "unset"
													)
												}
												value={field.state.value}
											>
												<option value="unset">未设置</option>
												<option value="male">男</option>
												<option value="female">女</option>
											</select>
										</div>
									)}
								</editForm.Field>

								<editForm.Field name="status">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>状态</Label>
											<select
												className="h-8 w-full rounded-none border bg-background px-2 text-xs"
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value as "active" | "leave" | "transfer"
													)
												}
												value={field.state.value}
											>
												<option value="active">在校</option>
												<option value="leave">休学</option>
												<option value="transfer">转学</option>
											</select>
										</div>
									)}
								</editForm.Field>
							</div>

							<editForm.Field name="enrollYear">
								{(field) => (
									<div className="space-y-1">
										<Label htmlFor={field.name}>入学年份</Label>
										<Input
											id={field.name}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													e.target.value
														? Number.parseInt(e.target.value)
														: undefined
												)
											}
											placeholder="2024"
											type="number"
											value={field.state.value ?? ""}
										/>
									</div>
								)}
							</editForm.Field>

							<editForm.Field name="contact">
								{(field) => (
									<div className="space-y-1">
										<Label htmlFor={field.name}>联系方式</Label>
										<Input
											id={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="家长电话或邮箱"
											value={field.state.value}
										/>
									</div>
								)}
							</editForm.Field>

							<DialogFooter showCloseButton>
								<editForm.Subscribe
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
								</editForm.Subscribe>
							</DialogFooter>
						</form>
					) : (
						<form
							className="space-y-3"
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void createForm.handleSubmit();
							}}
						>
							<div className="grid grid-cols-2 gap-3">
								<createForm.Field name="studentNo">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>学号 *</Label>
											<Input
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="学号"
												value={field.state.value}
											/>
											{field.state.meta.errors.map((err) => (
												<p
													className="text-destructive text-xs"
													key={String(err)}
												>
													{String(err)}
												</p>
											))}
										</div>
									)}
								</createForm.Field>

								<createForm.Field name="name">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>姓名 *</Label>
											<Input
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="姓名"
												value={field.state.value}
											/>
											{field.state.meta.errors.map((err) => (
												<p
													className="text-destructive text-xs"
													key={String(err)}
												>
													{String(err)}
												</p>
											))}
										</div>
									)}
								</createForm.Field>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<createForm.Field name="classId">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>班级 *</Label>
											<select
												className="h-8 w-full rounded-none border bg-background px-2 text-xs"
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value ? Number(e.target.value) : 0
													)
												}
												value={field.state.value || ""}
											>
												<option value="">选择班级</option>
												{classList.map((c) => (
													<option key={c.id} value={c.id}>
														{c.name}
													</option>
												))}
											</select>
											{field.state.meta.errors.map((err) => (
												<p
													className="text-destructive text-xs"
													key={String(err)}
												>
													{String(err)}
												</p>
											))}
										</div>
									)}
								</createForm.Field>

								<createForm.Field name="gender">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>性别</Label>
											<select
												className="h-8 w-full rounded-none border bg-background px-2 text-xs"
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value as "male" | "female" | "unset"
													)
												}
												value={field.state.value}
											>
												<option value="unset">未设置</option>
												<option value="male">男</option>
												<option value="female">女</option>
											</select>
										</div>
									)}
								</createForm.Field>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<createForm.Field name="enrollYear">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>入学年份</Label>
											<Input
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value
															? Number.parseInt(e.target.value)
															: undefined
													)
												}
												placeholder="2024"
												type="number"
												value={field.state.value ?? ""}
											/>
										</div>
									)}
								</createForm.Field>

								<createForm.Field name="status">
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>状态</Label>
											<select
												className="h-8 w-full rounded-none border bg-background px-2 text-xs"
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value as "active" | "leave" | "transfer"
													)
												}
												value={field.state.value}
											>
												<option value="active">在校</option>
												<option value="leave">休学</option>
												<option value="transfer">转学</option>
											</select>
										</div>
									)}
								</createForm.Field>
							</div>

							<createForm.Field name="contact">
								{(field) => (
									<div className="space-y-1">
										<Label htmlFor={field.name}>联系方式</Label>
										<Input
											id={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="家长电话或邮箱"
											value={field.state.value}
										/>
									</div>
								)}
							</createForm.Field>

							<DialogFooter showCloseButton>
								<createForm.Subscribe
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
								</createForm.Subscribe>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>

			{/* Status change confirmation */}
			<AlertDialog
				onOpenChange={(open) => !open && setStatusTarget(null)}
				open={!!statusTarget}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认修改状态</AlertDialogTitle>
						<AlertDialogDescription>
							确认将「{statusTarget?.name}」标记为休学？
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							disabled={updateStatusMut.isPending}
							onClick={() =>
								statusTarget &&
								updateStatusMut.mutate({ id: statusTarget.id, status: "leave" })
							}
						>
							确认
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<StudentImportDialog
				onOpenChange={setImportOpen}
				onSuccess={() => void invalidate()}
				open={importOpen}
			/>
		</div>
	);
}
