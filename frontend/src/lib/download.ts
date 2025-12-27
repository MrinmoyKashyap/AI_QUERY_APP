/**
 * Utility functions for downloading data and files
 */

/**
 * Download data as a CSV file
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string = "export.csv") {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    // Get headers from first row
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvRows = [
        headers.join(","), // Header row
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape values with commas or quotes
                const stringValue = String(value ?? "");
                if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(",")
        )
    ];

    const csvContent = csvRows.join("\n");

    // Create and download blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download chart as PNG image
 */
export function downloadChartAsPNG(chartContainerId: string, filename: string = "chart.png") {
    const container = document.getElementById(chartContainerId);
    if (!container) {
        console.warn("Chart container not found");
        return;
    }

    // Find the SVG element inside the container
    const svg = container.querySelector("svg");
    if (!svg) {
        console.warn("No SVG found in chart container");
        return;
    }

    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    // Create image and canvas for PNG conversion
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // Higher resolution
        canvas.width = svg.clientWidth * scale;
        canvas.height = svg.clientHeight * scale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Fill with white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    downloadBlob(blob, filename);
                }
            }, "image/png");
        }
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

/**
 * Copy data to clipboard as tab-separated values
 */
export async function copyToClipboard(data: Record<string, unknown>[]): Promise<boolean> {
    if (!data || data.length === 0) return false;

    const headers = Object.keys(data[0]);
    const rows = [
        headers.join("\t"),
        ...data.map(row => headers.map(h => String(row[h] ?? "")).join("\t"))
    ];

    try {
        await navigator.clipboard.writeText(rows.join("\n"));
        return true;
    } catch {
        return false;
    }
}
