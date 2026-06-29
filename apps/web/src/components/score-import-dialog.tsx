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

const CSV_SCORE_SPLIT = /\r?\n/;

type Phase = "upload" | "preview" | "result";

interface ScoreImportDialogProps {
	classId: number;
	examId: number;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
	open: boolean;
}

interface CsvRow {
	idx: number;
	score: string;
	status: string;
	studentNo: string;
	subjectName: string;
}

interface ImportError {
	reason: string;
	row: number;
}

function parseCSV(text: string): CsvRow[] {
	const lines = text
		.split(CSV_SCORE_SPLIT)
		.map((l) => l.trim())
		.filter(Boolean);
	const rows: CsvRow[] = [];
	// skip header
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line) {
			continue;
		}
		const cols = line.split(",").map((c) => c.trim());
		rows.push({
			idx: i,
			studentNo: cols[0] ?? "",
			subjectName: cols[1] ?? "",
			score: cols[2] ?? "",
			status: cols[3] ?? "正常",
		});
	}
	return rows;
}

function rowLocalError(row: CsvRow): string | null {
	if (!row.studentNo) {
		return "学号不能为空";
	}
	if (!row.subjectName) {
		return "科目名称不能为空";
	}
	return null;
}

export function ScoreImportDialog({
	classId,
	examId,
	onOpenChange,
	onSuccess,
	open,
}: ScoreImportDialogProps) {
	const [phase, setPhase] = useState<Phase>("upload");
	const [rows, setRows] = useState<CsvRow[]>([]);
	const [localErrors, setLocalErrors] = useState<ImportError[]>([]);
	const [result, setResult] = useState<{
		errors: ImportError[];
		success: number;
	} | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const importMut = useMutation(
		trpc.score.csvImport.mutationOptions({
			onSuccess: (data) => {
				setResult(data);
				setPhase("result");
				if (data.errors.length === 0) {
					toast.success(`成功导入 ${data.success} 条成绩`);
					onSuccess();
				} else {
					toast.warning(
						`导入完成：${data.success} 成功，${data.errors.length} 失败`
					);
				}
			},
			onError: (e) => toast.error(`导入失败：${e.message}`),
		})
	);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			const parsed = parseCSV(text);
			const errs: ImportError[] = [];
			for (const row of parsed) {
				const err = rowLocalError(row);
				if (err) {
					errs.push({ row: row.idx, reason: err });
				}
			}
			setRows(parsed);
			setLocalErrors(errs);
			setPhase("preview");
		};
		reader.readAsText(file, "utf-8");
	};

	const handleImport = () => {
		const validRows = rows.filter((r) => !rowLocalError(r));
		importMut.mutate({
			examId,
			classId,
			rows: validRows.map((r) => ({
				studentNo: r.studentNo,
				subjectName: r.subjectName,
				score: r.score,
				status: r.status,
			})),
		});
	};

	const handleOpenChange = (val: boolean) => {
		if (!val) {
			setPhase("upload");
			setRows([]);
			setLocalErrors([]);
			setResult(null);
			if (fileRef.current) {
				fileRef.current.value = "";
			}
		}
		onOpenChange(val);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>CSV 成绩导入</DialogTitle>
				</DialogHeader>

				{phase === "upload" && (
					<div className="space-y-4">
						<div className="rounded-none border border-dashed p-6 text-center">
							<Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
							<p className="mb-1 text-sm">选择 CSV 文件上传</p>
							<p className="mb-3 text-muted-foreground text-xs">
								格式：学号, 科目名称, 分数, 状态（正常/缺考/免考）
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
						<div className="text-muted-foreground text-xs">
							<p className="font-medium">CSV 示例：</p>
							<pre className="mt-1 rounded-none bg-muted p-2 text-xs">
								{"学号,科目名称,分数,状态\nS001,语文,88,正常\nS002,数学,,缺考"}
							</pre>
						</div>
					</div>
				)}

				{phase === "preview" && (
					<div className="space-y-3">
						<div className="flex items-center justify-between text-sm">
							<span>
								共 {rows.length} 行
								{localErrors.length > 0 && (
									<span className="ml-1 text-red-600">
										（{localErrors.length} 行本地校验失败）
									</span>
								)}
							</span>
							<Button
								onClick={() => {
									setPhase("upload");
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
										<TableHead>科目</TableHead>
										<TableHead>分数</TableHead>
										<TableHead>状态</TableHead>
										<TableHead>校验</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => {
										const err = rowLocalError(row);
										return (
											<TableRow
												className={err ? "bg-red-50 dark:bg-red-950/20" : ""}
												key={row.idx}
											>
												<TableCell className="text-muted-foreground text-xs">
													{row.idx}
												</TableCell>
												<TableCell className="text-xs">
													{row.studentNo}
												</TableCell>
												<TableCell className="text-xs">
													{row.subjectName}
												</TableCell>
												<TableCell className="text-xs">
													{row.score || "—"}
												</TableCell>
												<TableCell className="text-xs">{row.status}</TableCell>
												<TableCell className="text-xs">
													{err ? (
														<span className="text-red-600">{err}</span>
													) : (
														<span className="text-green-600">✓</span>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				)}

				{phase === "result" && result && (
					<div className="space-y-3">
						<div className="flex gap-4 text-sm">
							<span className="text-green-600">
								✓ 成功: {result.success} 条
							</span>
							{result.errors.length > 0 && (
								<span className="text-red-600">
									✗ 失败: {result.errors.length} 条
								</span>
							)}
						</div>
						{result.errors.length > 0 && (
							<div className="max-h-48 overflow-auto rounded-none border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-16">行号</TableHead>
											<TableHead>原因</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{result.errors.map((err) => (
											<TableRow key={err.row}>
												<TableCell className="text-xs">{err.row}</TableCell>
												<TableCell className="text-red-600 text-xs">
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
							onClick={handleImport}
						>
							{importMut.isPending
								? "导入中…"
								: `确认导入（${rows.filter((r) => !rowLocalError(r)).length} 条有效数据）`}
						</Button>
					)}
					{phase === "result" && result?.errors.length === 0 && (
						<Button onClick={() => handleOpenChange(false)}>关闭</Button>
					)}
					{phase === "result" && (result?.errors.length ?? 0) > 0 && (
						<Button onClick={() => handleOpenChange(false)} variant="outline">
							关闭
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
