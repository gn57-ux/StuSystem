import {
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

interface RadarPoint {
	subject: string;
	value: number;
}

interface SubjectRadarProps {
	data: RadarPoint[];
}

export function SubjectRadar({ data }: SubjectRadarProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
				暂无数据
			</div>
		);
	}

	return (
		<ResponsiveContainer height={220} width="100%">
			<RadarChart cx="50%" cy="50%" data={data} outerRadius={80}>
				<PolarGrid />
				<PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
				<Radar
					dataKey="value"
					fill="#3b82f6"
					fillOpacity={0.3}
					name="标准化分"
					stroke="#3b82f6"
				/>
				<Tooltip formatter={(v) => [`${Number(v).toFixed(1)}`, "标准化分"]} />
			</RadarChart>
		</ResponsiveContainer>
	);
}
