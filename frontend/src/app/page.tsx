"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Database,
    MessageSquare,
    BarChart3,
    Edit3,
    Trash2,
    RefreshCw,
    Sparkles,
    Table,
    FileSpreadsheet,
    Rows,
    Columns,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/FileUpload";
import DataTable from "@/components/DataTable";
import QueryInput from "@/components/QueryInput";
import ChartDisplay from "@/components/ChartDisplay";
import DataEditor from "@/components/DataEditor";
import ThemeToggle from "@/components/ThemeToggle";
import ModelSelector from "@/components/ModelSelector";
import {
    DatasetInfo,
    DatasetPreview,
    LLMModel,
    getDataset,
    getDatasets,
    deleteDataset,
    getQuerySuggestions,
    updateCell,
    getModels,
} from "@/lib/api";
import { formatBytes, formatNumber } from "@/lib/utils";

export default function Home() {
    const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<DatasetInfo | null>(null);
    const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        page_size: 50,
        total_rows: 0,
        total_pages: 0,
    });
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("query");
    const [models, setModels] = useState<LLMModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [modelsLoading, setModelsLoading] = useState(true);

    // Load datasets and models on mount
    useEffect(() => {
        loadDatasets();
        loadModels();
    }, []);

    // Persist model selection to localStorage
    useEffect(() => {
        if (selectedModel) {
            localStorage.setItem("preferred_model", selectedModel);
        }
    }, [selectedModel]);

    const loadModels = async () => {
        try {
            const result = await getModels();
            setModels(result.models);
            // Load from localStorage or use default
            const savedModel = localStorage.getItem("preferred_model");
            if (savedModel && result.models.some((m) => m.id === savedModel)) {
                setSelectedModel(savedModel);
            } else {
                setSelectedModel(result.default);
            }
        } catch (error) {
            console.error("Failed to load models:", error);
        } finally {
            setModelsLoading(false);
        }
    };

    const loadDatasets = async () => {
        try {
            const result = await getDatasets();
            setDatasets(result.datasets);
        } catch (error) {
            console.error("Failed to load datasets:", error);
        }
    };

    const handleUploadSuccess = (data: DatasetPreview) => {
        setDatasets((prev) => [data.info, ...prev]);
        selectDataset(data.info);
    };

    const selectDataset = useCallback(async (dataset: DatasetInfo) => {
        setSelectedDataset(dataset);
        setLoading(true);

        try {
            const [dataResult, suggestionsResult] = await Promise.all([
                getDataset(dataset.id, 1, 50),
                getQuerySuggestions(dataset.id),
            ]);

            setTableData(dataResult.data);
            setPagination(dataResult.pagination);
            setSuggestions(suggestionsResult.suggestions);
        } catch (error) {
            console.error("Failed to load dataset:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handlePageChange = async (page: number) => {
        if (!selectedDataset) return;

        setLoading(true);
        try {
            const result = await getDataset(selectedDataset.id, page, pagination.page_size);
            setTableData(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error("Failed to change page:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCellEdit = async (rowIndex: number, columnName: string, newValue: unknown) => {
        if (!selectedDataset) return;

        try {
            await updateCell(selectedDataset.id, rowIndex, columnName, newValue);
            // Refresh current page
            handlePageChange(pagination.current_page);
        } catch (error) {
            console.error("Failed to update cell:", error);
        }
    };

    const handleDeleteDataset = async (datasetId: string) => {
        if (!confirm("Are you sure you want to delete this dataset?")) return;

        try {
            await deleteDataset(datasetId);
            setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
            if (selectedDataset?.id === datasetId) {
                setSelectedDataset(null);
                setTableData([]);
            }
        } catch (error) {
            console.error("Failed to delete dataset:", error);
        }
    };

    const refreshData = async () => {
        if (selectedDataset) {
            setLoading(true);
            try {
                const [dataResult, suggestionsResult] = await Promise.all([
                    getDataset(selectedDataset.id, pagination.current_page, pagination.page_size),
                    getQuerySuggestions(selectedDataset.id),
                ]);
                
                // Update both the data AND the dataset info (in case columns/rows changed)
                setSelectedDataset(dataResult.info);
                setTableData(dataResult.data);
                setPagination(dataResult.pagination);
                setSuggestions(suggestionsResult.suggestions);
            } catch (error) {
                console.error("Failed to refresh data:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo-light.png"
                                alt="AI Data Query"
                                className="w-12 h-12 rounded-xl dark:hidden"
                            />
                            <img
                                src="/logo-dark.png"
                                alt="AI Data Query"
                                className="w-12 h-12 rounded-xl hidden dark:block"
                            />
                            <div>
                                <h1 className="text-xl font-bold text-foreground">AI Data Query</h1>
                                <p className="text-sm text-muted-foreground">
                                    Natural language data analysis
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <ModelSelector
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                                models={models}
                                loading={modelsLoading}
                            />
                            {selectedDataset && (
                                <>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium text-foreground">
                                            {selectedDataset.original_filename}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatNumber(selectedDataset.rows)} rows •{" "}
                                            {selectedDataset.columns} columns
                                        </p>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={refreshData}>
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* No Dataset Selected - Upload View */}
                {!selectedDataset && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Hero Section */}
                        <div className="text-center space-y-4 py-8">
                            <h2 className="text-4xl font-bold text-gradient">
                                Analyze Your Data with AI
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Upload any dataset and ask questions in plain English. Generate
                                charts, modify data, and get insights instantly.
                            </p>
                        </div>

                        {/* Upload Section */}
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-primary" />
                                    Upload Your Dataset
                                </CardTitle>
                                <CardDescription>
                                    Support for CSV and Excel files up to 100MB
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FileUpload onUploadSuccess={handleUploadSuccess} />
                            </CardContent>
                        </Card>

                        {/* Previous Datasets */}
                        {datasets.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Your Datasets
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {datasets.map((dataset) => (
                                        <Card
                                            key={dataset.id}
                                            className="cursor-pointer hover:border-primary/50 transition-all"
                                            onClick={() => selectDataset(dataset)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10">
                                                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground truncate max-w-[150px]">
                                                                {dataset.original_filename}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatBytes(dataset.file_size)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteDataset(dataset.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Rows className="w-3 h-3" />
                                                        {formatNumber(dataset.rows)} rows
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Columns className="w-3 h-3" />
                                                        {dataset.columns} cols
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Features */}
                        <div className="grid gap-6 md:grid-cols-3 py-8">
                            <div className="text-center space-y-3">
                                <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-purple-500" />
                                </div>
                                <h3 className="font-semibold text-foreground">Natural Language Queries</h3>
                                <p className="text-sm text-muted-foreground">
                                    Ask questions about your data in plain English
                                </p>
                            </div>
                            <div className="text-center space-y-3">
                                <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                                    <BarChart3 className="w-6 h-6 text-cyan-500" />
                                </div>
                                <h3 className="font-semibold text-foreground">Interactive Charts</h3>
                                <p className="text-sm text-muted-foreground">
                                    Generate beautiful visualizations with AI
                                </p>
                            </div>
                            <div className="text-center space-y-3">
                                <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                    <Edit3 className="w-6 h-6 text-amber-500" />
                                </div>
                                <h3 className="font-semibold text-foreground">Data Modification</h3>
                                <p className="text-sm text-muted-foreground">
                                    Transform your data using natural language
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dataset Selected - Analysis View */}
                {selectedDataset && (
                    <div className="space-y-6">
                        {/* Dataset Stats */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-purple-500/10">
                                        <Rows className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">
                                            {formatNumber(selectedDataset.rows)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Total Rows</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-cyan-500/10">
                                        <Columns className="w-5 h-5 text-cyan-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">
                                            {selectedDataset.columns}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Columns</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-amber-500/10">
                                        <Database className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">
                                            {formatBytes(selectedDataset.file_size)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">File Size</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setSelectedDataset(null)}
                                    >
                                        Switch Dataset
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="flex-1 gap-2"
                                        onClick={() => {
                                            window.open(`http://localhost:8000/api/datasets/${selectedDataset.id}/export`, '_blank');
                                        }}
                                    >
                                        <Download className="w-4 h-4" />
                                        Export
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                                <TabsTrigger value="query" className="gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="hidden sm:inline">Query</span>
                                </TabsTrigger>
                                <TabsTrigger value="data" className="gap-2">
                                    <Table className="w-4 h-4" />
                                    <span className="hidden sm:inline">Data</span>
                                </TabsTrigger>
                                <TabsTrigger value="charts" className="gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Charts</span>
                                </TabsTrigger>
                                <TabsTrigger value="modify" className="gap-2">
                                    <Edit3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Modify</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="query">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Ask Questions About Your Data</CardTitle>
                                        <CardDescription>
                                            Use natural language to query your dataset. AI will convert
                                            your question to the appropriate operation.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <QueryInput
                                            datasetId={selectedDataset.id}
                                            suggestions={suggestions}
                                            model={selectedModel}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="data">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Dataset Preview</CardTitle>
                                        <CardDescription>
                                            Browse and edit your data. Click on any cell to modify it.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            data={tableData}
                                            columns={selectedDataset.column_names}
                                            totalRows={pagination.total_rows}
                                            currentPage={pagination.current_page}
                                            totalPages={pagination.total_pages}
                                            pageSize={pagination.page_size}
                                            onPageChange={handlePageChange}
                                            onCellEdit={handleCellEdit}
                                            loading={loading}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="charts">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Generate Charts</CardTitle>
                                        <CardDescription>
                                            Describe the visualization you want and AI will create it
                                            for you.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartDisplay datasetId={selectedDataset.id} model={selectedModel} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="modify">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Modify Your Data</CardTitle>
                                        <CardDescription>
                                            Use natural language commands to transform your dataset.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataEditor
                                            datasetId={selectedDataset.id}
                                            onModifySuccess={refreshData}
                                            model={selectedModel}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-border mt-16">
                <div className="container mx-auto px-4 py-6">
                    <p className="text-center text-sm text-muted-foreground">
                        AI Data Query System • Powered by Gemini AI
                    </p>
                </div>
            </footer>
        </main>
    );
}
