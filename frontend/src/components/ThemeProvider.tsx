"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    setTheme: () => { },
    actualTheme: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");
    const [actualTheme, setActualTheme] = useState<"dark" | "light">("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        const applyTheme = (newTheme: "dark" | "light") => {
            root.classList.remove("dark", "light");
            root.classList.add(newTheme);
            setActualTheme(newTheme);
        };

        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            applyTheme(mediaQuery.matches ? "dark" : "light");

            const handler = (e: MediaQueryListEvent) => {
                applyTheme(e.matches ? "dark" : "light");
            };
            mediaQuery.addEventListener("change", handler);
            return () => mediaQuery.removeEventListener("change", handler);
        } else {
            applyTheme(theme);
        }
    }, [theme, mounted]);

    const handleSetTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
    };

    // Always provide context, even before mounting
    return (
        <ThemeContext.Provider
            value={{ theme, setTheme: handleSetTheme, actualTheme }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
