"use client";

import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
    const { theme, setTheme, actualTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === "light") {
            setTheme("dark");
        } else if (theme === "dark") {
            setTheme("system");
        } else {
            setTheme("light");
        }
    };

    const getIcon = () => {
        if (theme === "system") {
            return <Monitor className="w-5 h-5" />;
        }
        return actualTheme === "dark" ? (
            <Moon className="w-5 h-5" />
        ) : (
            <Sun className="w-5 h-5" />
        );
    };

    const getLabel = () => {
        switch (theme) {
            case "light":
                return "Light";
            case "dark":
                return "Dark";
            case "system":
                return "System";
        }
    };

    return (
        <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-foreground"
            title={`Current: ${getLabel()}. Click to change.`}
        >
            {getIcon()}
            <span className="text-sm font-medium hidden sm:inline">{getLabel()}</span>
        </button>
    );
}
