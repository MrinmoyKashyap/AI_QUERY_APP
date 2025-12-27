"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, Check, Loader2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { uploadFile, DatasetPreview } from "@/lib/api";

interface FileUploadProps {
    onUploadSuccess: (data: DatasetPreview) => void;
    onUploadError?: (error: string) => void;
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            // Validate file type
            const validTypes = [".csv", ".xlsx", ".xls"];
            const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

            if (!validTypes.includes(fileExt)) {
                const errorMsg = "Invalid file type. Please upload a CSV or Excel file.";
                setError(errorMsg);
                onUploadError?.(errorMsg);
                return;
            }

            setUploadedFile(file);
            setError(null);
            setSuccess(false);
            setUploading(true);

            try {
                const result = await uploadFile(file);
                setSuccess(true);
                onUploadSuccess(result);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Upload failed";
                setError(errorMsg);
                onUploadError?.(errorMsg);
            } finally {
                setUploading(false);
            }
        },
        [onUploadSuccess, onUploadError]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
        },
        maxFiles: 1,
        disabled: uploading,
    });

    const resetUpload = () => {
        setUploadedFile(null);
        setError(null);
        setSuccess(false);
    };

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={cn(
                    "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer",
                    isDragActive
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    uploading && "pointer-events-none opacity-70",
                    success && "border-green-500 bg-green-500/10",
                    error && "border-destructive bg-destructive/10"
                )}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    {/* Icon */}
                    <div
                        className={cn(
                            "p-4 rounded-2xl transition-all duration-300",
                            isDragActive ? "bg-primary/20" : "bg-muted",
                            success && "bg-green-500/20",
                            error && "bg-destructive/20"
                        )}
                    >
                        {uploading ? (
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        ) : success ? (
                            <Check className="w-10 h-10 text-green-500" />
                        ) : error ? (
                            <X className="w-10 h-10 text-destructive" />
                        ) : uploadedFile ? (
                            <FileSpreadsheet className="w-10 h-10 text-primary" />
                        ) : (
                            <Upload className="w-10 h-10 text-muted-foreground" />
                        )}
                    </div>

                    {/* Text */}
                    {uploadedFile ? (
                        <div className="space-y-1">
                            <p className="font-medium text-foreground">{uploadedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatBytes(uploadedFile.size)}
                            </p>
                            {success && (
                                <p className="text-sm text-green-500 font-medium">
                                    Upload successful!
                                </p>
                            )}
                            {error && (
                                <p className="text-sm text-destructive font-medium">{error}</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-lg font-medium text-foreground">
                                {isDragActive ? "Drop your file here" : "Drag & drop your dataset"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                or click to browse • CSV, Excel files supported
                            </p>
                        </div>
                    )}

                    {/* Upload button or reset */}
                    {uploadedFile && !uploading && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                resetUpload();
                            }}
                        >
                            Upload another file
                        </Button>
                    )}
                </div>

                {/* Progress indicator */}
                {uploading && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden rounded-b-2xl">
                        <div className="h-full bg-primary animate-pulse-slow w-full" />
                    </div>
                )}
            </div>
        </div>
    );
}
