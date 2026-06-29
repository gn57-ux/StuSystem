import { Button } from "@student-performance/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@student-performance/ui/components/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@student-performance/ui/components/table";
import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

interface StudentImportDialogProps {
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
	open: boolean;
}

type Phase = "upload" | "preview" | "result";

interface CsvRow {
	className: string;
	contact: string;
	enrollYear: string;
	gender: string;
	idx: number;
	name: string;
	studentNo: string;
}

interface ImportError {
	reason: string;
	row: number;
}

const CSV_LINE_SPLIT = /\r?\n/;

function normalizeGender(raw: string): string {
	if (raw === "男") {
		return "male";
	}
	if (raw === "女") {
		return "female";
	}
	return raw;
}

function parseCSV(text: string): CsvRow[] {
	const lines = text.trim().split(CSV_LINE_SPLIT);
	if (lines.length < 2) {
		return [];
	}
	return lines
		.slice(1)
		.map((line, i) => {
			const parts = line.split(",").map((p) => p.trim());
			return {
				idx: i,
				studentNo: parts[0] ?? "",
				name: parts[1] ?? "",
				className: parts[2] ?? "",
				gender: normalizeGender(parts[3] ?? ""),
				enrollYear: parts[4] ?? "",
				contact: parts[5] ?? "",
			};
		})
		.filter((row) => row.studentNo || row.name || row.className);
}

function rowLocalError(row: CsvRow): string | null {
	if (!row.studentNo) {
		return "学号不能为空";
	}
	if (!row.name) {
		return "姓名不能为空";
	}
	if (!row.className) {
		return "班级名称不能为空";
	}
	return null;
}

export function StudentImportDialog({
	open,
	onOpenChange,
	onSuccess,
}: StudentImportDialogProps) {
	const [phase, setPhase] = useState<Phase>("upload");
	const [rows, setRows] = useState<CsvRow[]>([]);
	const [importResult, setImportResult] = useState<{
		success: number;
		errors: ImportError[];
	} | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const importMut = useMutation(
		trpc.student.bulkImport.mutationOptions({
			onSuccess: (data) => {
				setImportResult(data);
				setPhase("result");
				if (data.errors.length === 0) {
					toast.success(`成功导入 ${data.success} 名学生`);
					onSuccess();
				}
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}
		const reader = new FileReader();
		reader.onload = (evt) => {
			const text = evt.target?.result as string;
			const parsed = parseCSV(text);
			if (parsed.length === 0) {
				toast.error("CSV 文件内容为空或格式不正确");
				return;
			}
			setRows(parsed);
			setPhase("preview");
		};
		reader.readAsText(file, "utf-8");
	};

	const handleConfirm = () => {
		importMut.mutate({
			rows: rows.map((r) => ({
				studentNo: r.studentNo,
				name: r.name,
				className: r.className,
				gender: r.gender || undefined,
				enrollYear: r.enrollYear || undefined,
				contact: r.contact || undefined,
			})),
		});
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setPhase("upload");
			setRows([]);
			setImportResult(null);
			if (fileRef.current) {
				fileRef.current.value = "";
			}
		}
		onOpenChange(next);
	};

	const errorCount = rows.filter((r) => rowLocalError(r) !== null).length;

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>批量导入学生</DialogTitle>
				</DialogHeader>

				{phase === "upload" && (
					<div className="space-y-4">
						<div className="rounded-none border border-dashed p-8 text-center">
							<Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
							<p className="mb-1 font-medium text-sm">选择 CSV 文件</p>
							<p className="mb-4 text-muted-foreground text-xs">
								格式：学号,姓名,班级名称,性别,入学年份,联系方式
							</p>
							<Button
								onClick={() => fileRef.current?.click()}
								size="sm"
								variant="outline"
							>
								选择文件
							</Button>
							<input
								accept=".csv,text/csv"
								className="hidden"
								onChange={handleFileChange}
								ref={fileRef}
								type="file"
							/>
						</div>
						<p className="text-muted-foreground text-xs leading-relaxed">
							· 第一行为表头，从第二行开始为数据
							<br />· 性别填写：male / 男（男生）或 female /
							女（女生），留空视为未设置
							<br />· 班级名称须与系统中已有班级完全匹配
						</p>
					</div>
				)}

				{phase === "preview" && (
					<div className="space-y-3">
						<div className="flex items-center justify-between text-xs">
							<span>
								共 {rows.length} 条
								{errorCount > 0 ? (
									<span className="ml-1 text-destructive">
										，{errorCount} 行格式有误（已标红，提交后跳过）
									</span>
								) : (
									<span className="ml-1 text-green-600">，格式检查通过</span>
								)}
							</span>
							<Button
								className="h-6 text-xs"
								onClick={() => {
									setPhase("upload");
									setRows([]);
									if (fileRef.current) {
										fileRef.current.value = "";
									}
								}}
								size="sm"
								variant="ghost"
							>
								重新选择
							</Button>
						</div>
						<div className="max-h-64 overflow-auto rounded-none border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-8">#</TableHead>
										<TableHead>学号</TableHead>
										<TableHead>姓名</TableHead>
										<TableHead>班级</TableHead>
										<TableHead>性别</TableHead>
										<TableHead>入学年份</TableHead>
										<TableHead>联系方式</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => {
										const err = rowLocalError(row);
										return (
											<TableRow
												className={
													err ? "bg-red-50 dark:bg-red-950/20" : undefined
												}
												key={row.idx}
											>
												<TableCell className="text-muted-foreground text-xs">
													{row.idx + 1}
												</TableCell>
												<TableCell
													className={`text-xs${row.studentNo ? "" : "font-medium text-destructive"}`}
												>
													{row.studentNo || "—"}
												</TableCell>
												<TableCell
													className={`text-xs${row.name ? "" : "font-medium text-destructive"}`}
												>
													{row.name || "—"}
												</TableCell>
												<TableCell
													className={`text-xs${row.className ? "" : "font-medium text-destructive"}`}
												>
													{row.className || "—"}
												</TableCell>
												<TableCell className="text-xs">
													{row.gender || "—"}
												</TableCell>
												<TableCell className="text-xs">
													{row.enrollYear || "—"}
												</TableCell>
												<TableCell className="text-xs">
													{row.contact || "—"}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				)}

				{phase === "result" && importResult && (
					<div className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-none border p-4 text-center">
								<p className="font-bold text-2xl text-green-600">
									{importResult.success}
								</p>
								<p className="text-muted-foreground text-xs">成功导入</p>
							</div>
							<div className="rounded-none border p-4 text-center">
								<p className="font-bold text-2xl text-destructive">
									{importResult.errors.length}
								</p>
								<p className="text-muted-foreground text-xs">导入失败</p>
							</div>
						</div>
						{importResult.errors.length > 0 && (
							<div className="max-h-48 overflow-auto rounded-none border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-20">行号</TableHead>
											<TableHead>失败原因</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{importResult.errors.map((err) => (
											<TableRow key={err.row}>
												<TableCell className="text-xs">
													第 {err.row} 行
												</TableCell>
												<TableCell className="text-destructive text-xs">
													{err.reason}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				)}

				<DialogFooter showCloseButton>
					{phase === "preview" && (
						<Button
							disabled={importMut.isPending || rows.length === 0}
							onClick={handleConfirm}
						>
							{importMut.isPending ? "导入中…" : `确认导入 ${rows.length} 条`}
						</Button>
					)}
					{phase === "result" && (
						<Button onClick={() => handleOpenChange(false)}>完成</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
