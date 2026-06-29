interface ExportRow {
	fullScore: number | null;
	rankInClass: number | null;
	score: number | null;
	status: string | null;
	studentName: string | null;
	studentNo: string | null;
	subjectName: string;
}

const CSV_HEADERS = [
	"学号",
	"姓名",
	"科目",
	"分数",
	"满分",
	"状态",
	"班级排名",
];

function escapeCell(value: string | number | null | undefined): string {
	const str = value == null ? "" : String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function downloadCsv(rows: ExportRow[], filename: string): void {
	const lines = [
		CSV_HEADERS.join(","),
		...rows.map((r) =>
			[
				escapeCell(r.studentNo),
				escapeCell(r.studentName),
				escapeCell(r.subjectName),
				escapeCell(r.score),
				escapeCell(r.fullScore),
				escapeCell(r.status),
				escapeCell(r.rankInClass),
			].join(",")
		),
	];

	// BOM ensures Windows Excel reads UTF-8 correctly
	const blob = new Blob([`﻿${lines.join("\n")}`], {
		type: "text/csv;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
