import { useCallback, useRef, useState } from "react";

const SCORE_INPUT_PATTERN = /^\d*\.?\d*$/;

type ScoreStatus = "normal" | "absent" | "exempt" | "pending";

interface CellState {
	error?: string;
	id?: number;
	isDirty: boolean;
	score: string;
	status: ScoreStatus;
}

// studentId → subjectId → CellState
export type ScoreGrid = Map<number, Map<number, CellState>>;

interface StudentRow {
	id: number;
	name: string;
	studentNo: string;
}

interface SubjectCol {
	fullScore: number;
	id: number;
	name: string;
}

interface ScoreRow {
	id?: number;
	score: string | null;
	status: string;
	studentId: number;
	subjectId: number;
}

interface ScoreEntryTableProps {
	onGridChange: (grid: ScoreGrid) => void;
	readOnly?: boolean;
	scores: ScoreRow[];
	students: StudentRow[];
	subjects: SubjectCol[];
}

const STATUS_LABEL: Record<ScoreStatus, string> = {
	normal: "正常",
	absent: "缺考",
	exempt: "免考",
	pending: "未录入",
};

const STATUS_CYCLE: ScoreStatus[] = ["normal", "absent", "exempt"];

function buildGrid(
	students: StudentRow[],
	subjects: SubjectCol[],
	scores: ScoreRow[]
): ScoreGrid {
	const grid: ScoreGrid = new Map();
	for (const stu of students) {
		grid.set(stu.id, new Map());
	}
	for (const sub of subjects) {
		for (const stu of students) {
			const row = grid.get(stu.id);
			if (!row) {
				continue;
			}
			row.set(sub.id, {
				score: "",
				status: "pending",
				isDirty: false,
			});
		}
	}
	for (const s of scores) {
		const row = grid.get(s.studentId);
		if (!row) {
			continue;
		}
		row.set(s.subjectId, {
			id: s.id,
			score: s.score ?? "",
			status: (s.status as ScoreStatus) ?? "pending",
			isDirty: false,
		});
	}
	return grid;
}

export function ScoreEntryTable({
	students,
	subjects,
	scores,
	onGridChange,
	readOnly = false,
}: ScoreEntryTableProps) {
	const [grid, setGrid] = useState<ScoreGrid>(() =>
		buildGrid(students, subjects, scores)
	);
	const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

	const getCell = useCallback(
		(studentId: number, subjectId: number): CellState =>
			grid.get(studentId)?.get(subjectId) ?? {
				score: "",
				status: "pending",
				isDirty: false,
			},
		[grid]
	);

	const updateCell = useCallback(
		(studentId: number, subjectId: number, patch: Partial<CellState>) => {
			setGrid((prev) => {
				const next = new Map(prev);
				const row = new Map(next.get(studentId) ?? []);
				const cell = row.get(subjectId) ?? {
					score: "",
					status: "pending" as ScoreStatus,
					isDirty: false,
				};
				row.set(subjectId, { ...cell, ...patch, isDirty: true });
				next.set(studentId, row);
				onGridChange(next);
				return next;
			});
		},
		[onGridChange]
	);

	const focusCell = (studentIdx: number, subjectIdx: number) => {
		const stu = students[studentIdx];
		const sub = subjects[subjectIdx];
		if (!(stu && sub)) {
			return;
		}
		const key = `${stu.id}-${sub.id}`;
		inputRefs.current.get(key)?.focus();
	};

	const handleTabNav = (shiftKey: boolean, stuIdx: number, subIdx: number) => {
		const nextSubIdx = shiftKey ? subIdx - 1 : subIdx + 1;
		if (nextSubIdx >= 0 && nextSubIdx < subjects.length) {
			focusCell(stuIdx, nextSubIdx);
			return;
		}
		if (!shiftKey && stuIdx + 1 < students.length) {
			focusCell(stuIdx + 1, 0);
			return;
		}
		if (shiftKey && stuIdx > 0) {
			focusCell(stuIdx - 1, subjects.length - 1);
		}
	};

	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
		studentIdx: number,
		subjectIdx: number
	) => {
		if (e.key === "Tab") {
			e.preventDefault();
			handleTabNav(e.shiftKey, studentIdx, subjectIdx);
		}
		if (e.key === "Enter") {
			e.preventDefault();
			if (studentIdx + 1 < students.length) {
				focusCell(studentIdx + 1, subjectIdx);
			}
		}
	};

	const handleBlur = (
		studentId: number,
		subjectId: number,
		fullScore: number
	) => {
		const cell = getCell(studentId, subjectId);
		if (!cell.score) {
			return;
		}
		const num = Number(cell.score);
		if (Number.isNaN(num) || num < 0) {
			updateCell(studentId, subjectId, { error: "分数格式无效" });
		} else if (num > fullScore) {
			updateCell(studentId, subjectId, {
				error: `超出满分 ${fullScore}`,
			});
		} else {
			updateCell(studentId, subjectId, { error: undefined });
		}
	};

	const cycleStatus = (studentId: number, subjectId: number) => {
		if (readOnly) {
			return;
		}
		const cell = getCell(studentId, subjectId);
		const currentIdx = STATUS_CYCLE.indexOf(
			cell.status as "normal" | "absent" | "exempt"
		);
		const nextStatus =
			STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length] ?? "normal";
		const newScore = nextStatus === "normal" ? cell.score : "";
		updateCell(studentId, subjectId, {
			status: nextStatus,
			score: newScore,
			error: undefined,
		});
	};

	if (students.length === 0 || subjects.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground text-sm">
				暂无学生或科目数据
			</div>
		);
	}

	return (
		<div className="overflow-auto">
			<table className="w-full border-collapse text-xs">
				<thead>
					<tr className="border-b bg-muted/50">
						<th className="sticky left-0 z-10 border-r bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground">
							学号
						</th>
						<th className="sticky left-16 z-10 border-r bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground">
							姓名
						</th>
						{subjects.map((sub) => (
							<th
								className="min-w-24 border-r px-2 py-2 text-center font-medium"
								key={sub.id}
							>
								{sub.name}
								<br />
								<span className="font-normal text-muted-foreground">
									/{sub.fullScore}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{students.map((stu, stuIdx) => (
						<tr className="border-b hover:bg-muted/20" key={stu.id}>
							<td className="sticky left-0 border-r bg-background px-3 py-1 font-mono">
								{stu.studentNo}
							</td>
							<td className="sticky left-16 border-r bg-background px-3 py-1 font-medium">
								{stu.name}
							</td>
							{subjects.map((sub, subIdx) => {
								const cell = getCell(stu.id, sub.id);
								const isNonNormal =
									cell.status !== "normal" && cell.status !== "pending";

								return (
									<td
										className={`border-r p-0 ${cell.error ? "bg-red-50 dark:bg-red-950/20" : ""}`}
										key={sub.id}
									>
										{isNonNormal || readOnly ? (
											<button
												className="flex h-8 w-full items-center justify-center gap-1"
												disabled={readOnly}
												onClick={() => cycleStatus(stu.id, sub.id)}
												title={readOnly ? undefined : "点击切换状态"}
												type="button"
											>
												<span
													className={`text-xs ${cell.status === "absent" ? "text-orange-600" : "text-blue-600"}`}
												>
													{STATUS_LABEL[cell.status]}
												</span>
											</button>
										) : (
											<div className="relative flex items-center">
												<input
													className={`h-8 w-full border-none bg-transparent px-2 text-center outline-none focus:bg-blue-50 dark:focus:bg-blue-950/20 ${cell.error ? "text-red-600" : ""}`}
													disabled={readOnly}
													onBlur={() =>
														handleBlur(stu.id, sub.id, sub.fullScore)
													}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || SCORE_INPUT_PATTERN.test(val)) {
															updateCell(stu.id, sub.id, { score: val });
														}
													}}
													onKeyDown={(e) => handleKeyDown(e, stuIdx, subIdx)}
													ref={(el) => {
														if (el) {
															inputRefs.current.set(`${stu.id}-${sub.id}`, el);
														} else {
															inputRefs.current.delete(`${stu.id}-${sub.id}`);
														}
													}}
													title={cell.error}
													type="text"
													value={cell.score}
												/>
												<button
													className="absolute right-0 flex h-4 w-4 items-center justify-center rounded text-muted-foreground opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
													onClick={() => cycleStatus(stu.id, sub.id)}
													tabIndex={-1}
													title="切换状态"
													type="button"
												>
													⋯
												</button>
											</div>
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function getDirtyScores(grid: ScoreGrid): {
	studentId: number;
	subjectId: number;
	score: string | null;
	status: ScoreStatus;
}[] {
	const result: {
		studentId: number;
		subjectId: number;
		score: string | null;
		status: ScoreStatus;
	}[] = [];
	for (const [studentId, row] of grid) {
		for (const [subjectId, cell] of row) {
			if (cell.isDirty) {
				result.push({
					studentId,
					subjectId,
					score: cell.score || null,
					status: cell.status,
				});
			}
		}
	}
	return result;
}
