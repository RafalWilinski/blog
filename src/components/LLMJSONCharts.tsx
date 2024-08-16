/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import React, { useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type SchemaType = "Complex JSON Schema" | "Super Complex JSON Schema" | "Wide JSON Schema";
type MetricType = "cost" | "successRate" | "time";

interface MethodData {
	cost: null | number;
	name: string;
	successRate: number;
	time: null | number;
}

type SchemaData = {
	[key in SchemaType]: MethodData[];
};

const data: SchemaData = {
	"Complex JSON Schema": [
		{ cost: 0.168, name: "gpt-4o-2024-08-06-non-strict-tool", successRate: 100, time: 4079.0854 },
		{ cost: 0.0175, name: "gpt-4o-mini-non-strict-json", successRate: 100, time: 5847.6183 },
		{ cost: 0.1528, name: "gpt-4o-2024-08-06-strict-json", successRate: 100, time: 5866.22 },
		{ cost: 0.3026, name: "gpt-4o-2024-08-06-non-strict-json", successRate: 100, time: 6314.3933 },
		{ cost: 0.0146, name: "gpt-4o-mini-strict-json", successRate: 100, time: 7858.5114 },
		{ cost: null, name: "gpt-4o-mini-non-strict-tool", successRate: 0, time: null },
	],
	"Super Complex JSON Schema": [
		{ cost: 0.3004, name: "gpt-4o-2024-08-06-strict-json", successRate: 100, time: 10743.025 },
		{ cost: 0.0393, name: "gpt-4o-mini-non-strict-json", successRate: 100, time: 12884.3888 },
		{ cost: 0.6619, name: "gpt-4o-2024-08-06-non-strict-json", successRate: 100, time: 13041.2693 },
		{ cost: 0.0241, name: "gpt-4o-mini-strict-json", successRate: 100, time: 13289.3869 },
		{ cost: null, name: "gpt-4o-2024-08-06-non-strict-tool", successRate: 0, time: null },
		{ cost: null, name: "gpt-4o-mini-non-strict-tool", successRate: 0, time: null },
	],
	"Wide JSON Schema": [
		{ cost: 0.0078, name: "gpt-4o-mini-non-strict-tool", successRate: 100, time: 2943.3405 },
		{ cost: 0.1313, name: "gpt-4o-2024-08-06-non-strict-tool", successRate: 100, time: 3149.5288 },
		{ cost: 0.0115, name: "gpt-4o-mini-non-strict-json", successRate: 100, time: 3603.0182 },
		{ cost: 0.1023, name: "gpt-4o-2024-08-06-strict-json", successRate: 100, time: 3852.814 },
		{ cost: 0.1964, name: "gpt-4o-2024-08-06-non-strict-json", successRate: 100, time: 4065.5266 },
		{ cost: 0.006, name: "gpt-4o-mini-strict-json", successRate: 100, time: 4530.8732 },
	],
};

const JsonSchemaPerformanceCharts: React.FC = () => {
	const [selectedSchema, setSelectedSchema] = useState<SchemaType>("Complex JSON Schema");
	const [selectedMetric, setSelectedMetric] = useState<MetricType>("time");

	const handleSchemaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedSchema(event.target.value as SchemaType);
	};

	const handleMetricChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedMetric(event.target.value as MetricType);
	};

	const chartData = data[selectedSchema].filter((item) => item[selectedMetric] !== null);

	return (
		<div className="p-4">
			<div className="mb-4">
				<label className="mr-2">
					Schema:
					<select
						className="ml-2 rounded border p-1"
						onChange={handleSchemaChange}
						value={selectedSchema}
					>
						{Object.keys(data).map((schema) => (
							<option key={schema} value={schema}>
								{schema}
							</option>
						))}
					</select>
				</label>
				<label className="ml-4">
					Metric:
					<select
						className="ml-2 rounded border p-1"
						onChange={handleMetricChange}
						value={selectedMetric}
					>
						<option value="time">Time (ms)</option>
						<option value="cost">Cost</option>
						<option value="successRate">Success Rate (%)</option>
					</select>
				</label>
			</div>
			<ResponsiveContainer height={400} width="100%">
				<BarChart data={chartData}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis angle={-45} dataKey="name" height={100} textAnchor="end" />
					<YAxis />
					<Tooltip />
					<Legend />
					<Bar dataKey={selectedMetric} fill="#8884d8" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default JsonSchemaPerformanceCharts;
