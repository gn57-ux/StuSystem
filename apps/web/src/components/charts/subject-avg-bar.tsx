import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface SubjectAvgBarProps {
	data: { avg: number; subjectId: number; subjectName: string }[];
}

export function SubjectAvgBar({ data }: SubjectAvgBarProps) {
	const chartData = data.map((d) => ({
		avg: Number(d.avg.toFixed(1)),
		name: d.subjectName,
	}));

	return (
		<ResponsiveContainer height={200} width="100%">
			<BarChart data={chartData} layout="vertical">
				<CartesianGrid horizontal={false} strokeDasharray="3 3" />
				<XAxis domain={[0, "auto"]} tick={{ fontSize: 12 }} type="number" />
				<YAxis
					dataKey="name"
					tick={{ fontSize: 12 }}
					type="category"
					width={60}
				/>
				<Tooltip formatter={(v) => [`${v}`, "均分"]} />
				<Bar
					dataKey="avg"
					fill="hsl(var(--primary) / 0.8)"
					name="均分"
					radius={[0, 2, 2, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
