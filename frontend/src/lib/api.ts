import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Types
export interface DatasetInfo {
    id: string;
    filename: string;
    original_filename: string;
    rows: number;
    columns: number;
    column_names: string[];
    column_types: Record<string, string>;
    file_size: number;
    uploaded_at: string;
}

export interface DatasetPreview {
    info: DatasetInfo;
    preview_data: Record<string, unknown>[];
}

export interface QueryResult {
    query: string;
    result_type: "table" | "value" | "text" | "error";
    data: unknown;
    explanation: string;
    pandas_code: string | null;
    execution_time_ms: number;
}

export interface ChartConfig {
    chart_type: "bar" | "line" | "pie" | "scatter" | "area";
    title: string;
    x_axis: string | null;
    y_axis: string | null;
    x_label: string | null;
    y_label: string | null;
}

export interface ChartResponse {
    success: boolean;
    config: ChartConfig;
    data: Record<string, unknown>[];
    explanation: string;
    error?: string;
}

export interface DataModifyResult {
    success: boolean;
    message: string;
    changes_made: string;
    rows_affected: number;
    pandas_code: string | null;
}

export interface LLMModel {
    id: string;
    name: string;
    description: string;
    provider: string;
}

// API Functions

export async function uploadFile(file: File): Promise<DatasetPreview> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<DatasetPreview>("/api/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
}

export async function getDatasets(): Promise<{ datasets: DatasetInfo[]; total: number }> {
    const response = await api.get("/api/datasets");
    return response.data;
}

export async function getDataset(
    datasetId: string,
    page = 1,
    pageSize = 50
): Promise<{
    info: DatasetInfo;
    data: Record<string, unknown>[];
    pagination: {
        current_page: number;
        page_size: number;
        total_rows: number;
        total_pages: number;
    };
}> {
    const response = await api.get(`/api/datasets/${datasetId}`, {
        params: { page, page_size: pageSize },
    });
    return response.data;
}

export async function deleteDataset(datasetId: string): Promise<void> {
    await api.delete(`/api/datasets/${datasetId}`);
}

export async function queryDataset(
    datasetId: string,
    query: string,
    model?: string
): Promise<QueryResult> {
    const response = await api.post<QueryResult>("/api/query", {
        dataset_id: datasetId,
        query,
        model,
    });
    return response.data;
}

export async function getQuerySuggestions(
    datasetId: string
): Promise<{ suggestions: string[] }> {
    const response = await api.get(`/api/query/suggestions/${datasetId}`);
    return response.data;
}

export async function generateChart(
    datasetId: string,
    query: string,
    model?: string
): Promise<ChartResponse> {
    const response = await api.post<ChartResponse>("/api/charts/generate", {
        dataset_id: datasetId,
        query,
        model,
    });
    return response.data;
}

export async function modifyData(
    datasetId: string,
    command: string,
    model?: string
): Promise<DataModifyResult> {
    const response = await api.post<DataModifyResult>("/api/data/modify", {
        dataset_id: datasetId,
        command,
        model,
    });
    return response.data;
}

export async function getModels(): Promise<{ models: LLMModel[]; default: string }> {
    const response = await api.get("/api/models");
    return response.data;
}

export async function updateCell(
    datasetId: string,
    rowIndex: number,
    columnName: string,
    newValue: unknown
): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/data/${datasetId}/cell`, {
        row_index: rowIndex,
        column_name: columnName,
        new_value: newValue,
    });
    return response.data;
}

export async function getChartTypes(): Promise<{
    chart_types: { type: string; name: string; description: string }[];
}> {
    const response = await api.get("/api/charts/types");
    return response.data;
}

export default api;
