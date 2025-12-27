"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Sparkles, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Model {
    id: string;
    name: string;
    description: string;
    provider: string;
}

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    models: Model[];
    loading?: boolean;
}

export default function ModelSelector({
    selectedModel,
    onModelChange,
    models,
    loading = false,
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentModel = models.find((m) => m.id === selectedModel) || models[0];

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case "groq":
                return <Zap className="w-4 h-4 text-orange-500" />;
            case "gemini":
                return <Sparkles className="w-4 h-4 text-blue-500" />;
            default:
                return <Sparkles className="w-4 h-4 text-primary" />;
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case "groq":
                return "from-orange-500/10 to-orange-500/5 border-orange-500/20";
            case "gemini":
                return "from-blue-500/10 to-blue-500/5 border-blue-500/20";
            default:
                return "from-primary/10 to-primary/5 border-primary/20";
        }
    };

    if (loading || models.length === 0) {
        return (
            <div className="h-10 w-48 animate-pulse bg-muted rounded-lg" />
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
                    "bg-gradient-to-r hover:shadow-md",
                    getProviderColor(currentModel?.provider || ""),
                    isOpen && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                )}
            >
                {getProviderIcon(currentModel?.provider || "")}
                <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                    {currentModel?.name || "Select Model"}
                </span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 py-2 bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Select AI Model
                        </p>
                    </div>
                    {models.map((model) => (
                        <button
                            key={model.id}
                            onClick={() => {
                                onModelChange(model.id);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-start gap-3 px-3 py-3 hover:bg-muted/50 transition-colors",
                                selectedModel === model.id && "bg-muted/80"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-lg bg-gradient-to-br",
                                getProviderColor(model.provider)
                            )}>
                                {getProviderIcon(model.provider)}
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {model.name}
                                    </span>
                                    {selectedModel === model.id && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {model.description}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
