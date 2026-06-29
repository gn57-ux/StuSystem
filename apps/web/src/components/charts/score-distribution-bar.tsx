import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface ScoreDistributionBarProps {
	data: { count: number; range: string }[];
}

const ORDERED_RANGES = ["0-59", "60-74", "75-89", "90+"];

export function ScoreDistributionBar({ data }: ScoreDistributionBarProps) {
	const ordered = ORDERED_RANGES.map((range) => {
		const match = data.find((d) => d.range === range);
		return { range, count: match?.count ?? 0 };
	});

	return (
		<ResponsiveContainer height={200} width="100%">
			<BarChart data={ordered}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis dataKey="range" tick={{ fontSize: 12 }} />
				<YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
				<Tooltip formatter={(v) => [`${v} 人`, "人数"]} />
				<Bar
					dataKey="count"
					fill="hsl(var(--primary))"
					name="人数"
					radius={[2, 2, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
