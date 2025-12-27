"use client";

import React, { useState } from "react";
import { Send, Sparkles, Clock, Code, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queryDataset, QueryResult } from "@/lib/api";
import { downloadCSV } from "@/lib/download";
import DataTable from "./DataTable";

interface QueryInputProps {
    datasetId: string;
    suggestions?: string[];
    model?: string;
    onQueryResult?: (result: QueryResult) => void;
}

export default function QueryInput({
    datasetId,
    suggestions = [],
    model,
    onQueryResult,
}: QueryInputProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [showCode, setShowCode] = useState(false);
    const [history, setHistory] = useState<string[]>([]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || loading) return;

        setLoading(true);
        setResult(null);

        try {
            const queryResult = await queryDataset(datasetId, query.trim(), model);
            setResult(queryResult);
            onQueryResult?.(queryResult);

            // Add to history
            setHistory((prev) => {
                const newHistory = [query.trim(), ...prev.filter((q) => q !== query.trim())];
                return newHistory.slice(0, 10);
            });
        } catch (error) {
            setResult({
                query: query,
                result_type: "error",
                data: null,
                explanation: error instanceof Error ? error.message : "Query failed",
                pandas_code: null,
                execution_time_ms: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
    };

    const renderResult = () => {
        if (!result) return null;

        switch (result.result_type) {
            case "table":
                if (Array.isArray(result.data) && result.data.length > 0) {
                    const columns = Object.keys(result.data[0] as Record<string, unknown>);
                    return (
                        <DataTable
                            data={result.data as Record<string, unknown>[]}
                            columns={columns}
                        />
                    );
                }
                return <p className="text-muted-foreground">No data returned</p>;

            case "value":
                return (
                    <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                        <p className="text-3xl font-bold text-foreground">
                            {typeof result.data === "object"
                                ? JSON.stringify(result.data, null, 2)
                                : String(result.data)}
                        </p>
                    </div>
                );

            case "text":
                return (
                    <div className="p-4 rounded-xl bg-muted/50">
                        <p className="text-foreground whitespace-pre-wrap">
                            {String(result.data)}
                        </p>
                    </div>
                );

            case "error":
                return (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                        <p className="text-destructive">{result.explanation}</p>
                    </div>
                );

            default:
                return (
                    <pre className="p-4 rounded-xl bg-muted overflow-auto text-sm">
                        {JSON.stringify(result.data, null, 2)}
                    </pre>
                );
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Query Input */}
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Ask anything about your data... (e.g., 'Show average sales by region')"
                        className="w-full min-h-[60px] max-h-[200px] pl-12 pr-24 py-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={2}
                    />
                    <Button
                        type="submit"
                        disabled={!query.trim() || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        size="lg"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Query
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Suggestions */}
            {suggestions.length > 0 && !result && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">
                        Try these queries:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.slice(0, 6).map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Query History */}
            {history.length > 0 && !result && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent queries:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {history.slice(0, 5).map((historyItem, index) => (
                            <button
                                key={index}
                                onClick={() => setQuery(historyItem)}
                                className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors truncate max-w-[200px]"
                            >
                                {historyItem}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="space-y-4 animate-in">
                    {/* Result Header */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                {result.explanation}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Executed in {result.execution_time_ms.toFixed(0)}ms
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {result.result_type === "table" && Array.isArray(result.data) && result.data.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadCSV(result.data as Record<string, unknown>[], "query_result.csv")}
                                    className="gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download CSV
                                </Button>
                            )}
                            {result.pandas_code && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCode(!showCode)}
                                    className="gap-2"
                                >
                                    <Code className="w-4 h-4" />
                                    {showCode ? "Hide" : "Show"} Code
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Pandas Code */}
                    {showCode && result.pandas_code && (
                        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto text-sm">
                            <code>{result.pandas_code}</code>
                        </pre>
                    )}

                    {/* Result Content */}
                    {renderResult()}

                    {/* New Query Button */}
                    <div className="flex justify-center">
                        <Button variant="outline" onClick={() => setResult(null)}>
                            Ask another question
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
