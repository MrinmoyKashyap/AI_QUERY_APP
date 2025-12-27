import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AI Data Query - Natural Language Data Analysis",
    description: "Analyze your data using natural language with AI-powered insights",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider>
                    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
                        {children}
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
