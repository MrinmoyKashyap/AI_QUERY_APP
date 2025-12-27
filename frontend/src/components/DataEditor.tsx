"use client";

import React, { useState } from "react";
import { Wand2, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modifyData, DataModifyResult } from "@/lib/api";

interface DataEditorProps {
    datasetId: string;
    onModifySuccess?: () => void;
    model?: string;
}

export default function DataEditor({ datasetId, onModifySuccess, model }: DataEditorProps) {
    const [command, setCommand] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DataModifyResult | null>(null);

    const handleModify = async () => {
        if (!command.trim() || loading) return;

        setLoading(true);
        setResult(null);

        try {
            const modifyResult = await modifyData(datasetId, command.trim(), model);
            setResult(modifyResult);
            if (modifyResult.success) {
                onModifySuccess?.();
            }
        } catch (error) {
            setResult({
                success: false,
                message: error instanceof Error ? error.message : "Modification failed",
                changes_made: "",
                rows_affected: 0,
                pandas_code: null,
            });
        } finally {
            setLoading(false);
        }
    };

    const exampleCommands = [
        "Add a new column 'total' as price * quantity",
        "Delete rows where value is null",
        "Replace 'N/A' with 0 in all columns",
        "Convert 'date' column to datetime",
        "Rename column 'old_name' to 'new_name'",
        "Fill missing values with the column mean",
    ];

    return (
        <div className="w-full space-y-4">
            {/* Command Input */}
            <div className="space-y-3">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Wand2 className="w-5 h-5 text-primary" />
                    </div>
                    <textarea
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleModify();
                            }
                        }}
                        placeholder="Describe how you want to modify the data... (e.g., 'Add a total column that multiplies price by quantity')"
                        className="w-full min-h-[80px] max-h-[200px] pl-12 pr-32 py-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={3}
                    />
                    <Button
                        onClick={handleModify}
                        disabled={!command.trim() || loading}
                        className="absolute right-3 bottom-3"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Apply
                            </>
                        )}
                    </Button>
                </div>

                {/* Example Commands */}
                {!result && (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground font-medium">
                            Example commands:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {exampleCommands.slice(0, 4).map((example, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCommand(example)}
                                    className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors text-left"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Result */}
            {result && (
                <div
                    className={`p-4 rounded-xl border animate-in ${result.success
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-destructive/10 border-destructive/20"
                        }`}
                >
                    <div className="flex items-start gap-3">
                        {result.success ? (
                            <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                        )}
                        <div className="space-y-2 flex-1">
                            <p
                                className={`font-medium ${result.success ? "text-green-500" : "text-destructive"
                                    }`}
                            >
                                {result.message}
                            </p>
                            {result.changes_made && (
                                <p className="text-sm text-muted-foreground">
                                    {result.changes_made}
                                </p>
                            )}
                            {result.rows_affected > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Rows affected: {result.rows_affected}
                                </p>
                            )}
                            {result.pandas_code && (
                                <details className="mt-2">
                                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                        View generated code
                                    </summary>
                                    <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-sm">
                                        <code>{result.pandas_code}</code>
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>

                    {result.success && (
                        <div className="mt-4 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setResult(null);
                                    setCommand("");
                                }}
                            >
                                Make another change
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <h4 className="font-medium text-foreground mb-2">
                    💡 Data Modification Tips
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Be specific about column names and values</li>
                    <li>• Changes are applied immediately to your dataset</li>
                    <li>• Use natural language - no coding required</li>
                    <li>• You can undo by uploading the original file again</li>
                </ul>
            </div>
        </div>
    );
}
