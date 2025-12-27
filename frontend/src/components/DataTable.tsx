"use client";

import React, { useState, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Edit3,
    Check,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatNumber } from "@/lib/utils";

interface DataTableProps {
    data: Record<string, unknown>[];
    columns: string[];
    totalRows?: number;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
    onCellEdit?: (rowIndex: number, columnName: string, newValue: unknown) => void;
    loading?: boolean;
}

export default function DataTable({
    data,
    columns,
    totalRows = data.length,
    currentPage = 1,
    totalPages = 1,
    pageSize = 50,
    onPageChange,
    onCellEdit,
    loading = false,
}: DataTableProps) {
    const [editingCell, setEditingCell] = useState<{
        row: number;
        column: string;
    } | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const sortedData = useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            return sortDirection === "asc"
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }, [data, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const startEditing = (rowIndex: number, column: string, value: unknown) => {
        setEditingCell({ row: rowIndex, column });
        setEditValue(String(value ?? ""));
    };

    const cancelEditing = () => {
        setEditingCell(null);
        setEditValue("");
    };

    const saveEdit = () => {
        if (editingCell && onCellEdit) {
            // Try to parse as number if it looks like one
            let value: unknown = editValue;
            if (!isNaN(Number(editValue)) && editValue.trim() !== "") {
                value = Number(editValue);
            }
            onCellEdit(
                (currentPage - 1) * pageSize + editingCell.row,
                editingCell.column,
                value
            );
        }
        cancelEditing();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            saveEdit();
        } else if (e.key === "Escape") {
            cancelEditing();
        }
    };

    const formatCellValue = (value: unknown): string => {
        if (value === null || value === undefined) return "—";
        if (typeof value === "number") {
            return Number.isInteger(value) ? value.toString() : value.toFixed(2);
        }
        if (typeof value === "boolean") return value ? "Yes" : "No";
        return String(value);
    };

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading data...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <p className="text-muted-foreground">No data to display</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-12 text-center">#</th>
                                {columns.map((column) => (
                                    <th
                                        key={column}
                                        className="cursor-pointer hover:bg-muted transition-colors"
                                        onClick={() => handleSort(column)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{column}</span>
                                            {sortColumn === column && (
                                                <span className="text-primary">
                                                    {sortDirection === "asc" ? "↑" : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="text-center text-muted-foreground font-mono text-xs">
                                        {(currentPage - 1) * pageSize + rowIndex + 1}
                                    </td>
                                    {columns.map((column) => {
                                        const isEditing =
                                            editingCell?.row === rowIndex &&
                                            editingCell?.column === column;
                                        const value = row[column];

                                        return (
                                            <td key={column} className="group relative">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={handleKeyDown}
                                                            className="h-7 text-sm"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={saveEdit}
                                                        >
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={cancelEditing}
                                                        >
                                                            <X className="h-3 w-3 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <span
                                                            className={cn(
                                                                "truncate max-w-[200px]",
                                                                value === null && "text-muted-foreground italic"
                                                            )}
                                                            title={String(value ?? "")}
                                                        >
                                                            {formatCellValue(value)}
                                                        </span>
                                                        {onCellEdit && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => startEditing(rowIndex, column, value)}
                                                            >
                                                                <Edit3 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && onPageChange && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, totalRows)} of{" "}
                        {formatNumber(totalRows)} rows
                    </p>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="px-3 text-sm">
                            Page {currentPage} of {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
