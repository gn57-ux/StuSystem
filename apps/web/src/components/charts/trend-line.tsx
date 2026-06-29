import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface TrendPoint {
	label: string;
	value: number;
}

interface TrendLineProps {
	color?: string;
	data: TrendPoint[];
	reversed?: boolean;
	yAxisLabel?: string;
}

export function TrendLine({
	color = "#3b82f6",
	data,
	reversed = false,
	yAxisLabel,
}: TrendLineProps) {
	return (
		<ResponsiveContainer height={200} width="100%">
			<LineChart data={data} margin={{ bottom: 0, left: 0, right: 16, top: 8 }}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
				<YAxis
					label={
						yAxisLabel
							? {
									angle: -90,
									fontSize: 11,
									offset: 10,
									position: "insideLeft",
									value: yAxisLabel,
								}
							: undefined
					}
					reversed={reversed}
					tick={{ fontSize: 11 }}
					tickLine={false}
					width={36}
				/>
				<Tooltip
					formatter={(v) => [`${v}`, yAxisLabel ?? "数值"]}
					labelFormatter={(label) => `考试: ${label}`}
				/>
				<Line
					dataKey="value"
					dot={{ r: 3 }}
					stroke={color}
					strokeWidth={2}
					type="monotone"
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
