"use client";

import React, { useState } from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    ScatterChart,
    Scatter,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Send, Download, Loader2, BarChart3, LineChartIcon, PieChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateChart, ChartResponse } from "@/lib/api";
import { downloadCSV, downloadChartAsPNG } from "@/lib/download";

interface ChartDisplayProps {
    datasetId: string;
    model?: string;
}

const COLORS = [
    "#8b5cf6", // purple
    "#06b6d4", // cyan
    "#f59e0b", // amber
    "#ef4444", // red
    "#10b981", // emerald
    "#f97316", // orange
    "#ec4899", // pink
    "#6366f1", // indigo
];

export default function ChartDisplay({ datasetId, model }: ChartDisplayProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState<ChartResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!query.trim() || loading) return;

        setLoading(true);
        setError(null);

        try {
            const result = await generateChart(datasetId, query.trim(), model);
            if (result.success) {
                setChartData(result);
            } else {
                setError(result.error || "Failed to generate chart");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate chart");
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (!chartData?.data || chartData.data.length === 0) {
            return (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No data to display
                </div>
            );
        }

        const { config, data } = chartData;
        const xKey = config.x_axis || Object.keys(data[0])[0];
        const yKey = config.y_axis || Object.keys(data[0])[1] || "count";

        const commonProps = {
            data,
            margin: { top: 20, right: 30, left: 20, bottom: 20 },
        };

        switch (config.chart_type) {
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey={xKey}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                            />
                            <Legend />
                            <Bar dataKey={yKey} fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                {data.map((_, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "line":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey={xKey}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={yKey}
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case "pie":
                // Limit to top 10 items for pie chart readability
                const pieData = [...data]
                    .sort((a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0))
                    .slice(0, 10);

                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey={yKey}
                                nameKey={xKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                innerRadius={40}
                                paddingAngle={2}
                                labelLine={false}
                            >
                                {pieData.map((_, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number, name: string) => [value, name]}
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                            />
                            <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                wrapperStyle={{ fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case "scatter":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey={xKey}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                dataKey={yKey}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                            />
                            <Scatter dataKey={yKey} fill="#8b5cf6" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );

            case "area":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey={xKey}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey={yKey}
                                stroke="#8b5cf6"
                                fill="#8b5cf6"
                                fillOpacity={0.3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                );

            default:
                return (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        Unsupported chart type: {config.chart_type}
                    </div>
                );
        }
    };

    const chartExamples = [
        "Create a bar chart of sales by category",
        "Show a pie chart of distribution",
        "Make a line chart showing trends",
        "Scatter plot of price vs quantity",
    ];

    return (
        <div className="w-full space-y-6">
            {/* Chart Request Input */}
            <div className="space-y-3">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                        placeholder="Describe the chart you want... (e.g., 'Bar chart of sales by region')"
                        className="w-full h-14 pl-12 pr-32 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                        onClick={handleGenerate}
                        disabled={!query.trim() || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Generate
                            </>
                        )}
                    </Button>
                </div>

                {/* Quick examples */}
                {!chartData && (
                    <div className="flex flex-wrap gap-2">
                        {chartExamples.map((example, index) => (
                            <button
                                key={index}
                                onClick={() => setQuery(example)}
                                className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                    {error}
                </div>
            )}

            {/* Chart Display */}
            {chartData && chartData.success && (
                <Card className="animate-in">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{chartData.config.title}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadCSV(chartData.data as Record<string, unknown>[], "chart_data.csv")}
                                className="gap-1"
                            >
                                <Download className="w-4 h-4" />
                                CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadChartAsPNG("chart-container", `${chartData.config.title || "chart"}.png`)}
                                className="gap-1"
                            >
                                <Download className="w-4 h-4" />
                                PNG
                            </Button>
                            <span className="text-sm text-muted-foreground capitalize">
                                {chartData.config.chart_type} Chart
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            {chartData.explanation}
                        </p>
                        <div id="chart-container">
                            {renderChart()}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!chartData && !loading && !error && (
                <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-2xl">
                    <div className="flex gap-4 mb-4">
                        <BarChart3 className="w-10 h-10 text-muted-foreground" />
                        <LineChartIcon className="w-10 h-10 text-muted-foreground" />
                        <PieChartIcon className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        Create Beautiful Charts
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                        Describe the chart you want in plain English, and AI will generate
                        it for you. Try something like "Show sales by category as a bar chart"
                    </p>
                </div>
            )}
        </div>
    );
}
