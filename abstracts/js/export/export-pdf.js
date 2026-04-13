/**
 * PDF Download Module
 * Handles exporting table data to PDF format.
 * Uses jsPDF 4.x + jspdf-autotable 5.x directly
 * (bypasses Tabulator's built-in PDF downloader for full compatibility).
 */

const DownloadPDF = {
    /**
     * Download table data as PDF
     * @param {Object} table - Tabulator instance
     */
    download(table) {
        // jsPDF 4.x exposes itself as window.jspdf.jsPDF
        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: config.pdfOrientation,
        });

        // Extract headers and data from Tabulator
        const columns = table.getColumns();
        const headers = columns.map(col => col.getDefinition().title);
        const data = table.getData("active");

        const body = data.map(row =>
            columns.map(col => {
                const field = col.getDefinition().field;
                return row[field] != null ? String(row[field]) : '';
            })
        );

        // Add title
        doc.setFontSize(14);
        doc.text("Data Export", 14, 15);

        // Generate table using autotable (auto-applied to doc in browser)
        doc.autoTable({
            head: [headers],
            body: body,
            startY: 20,
            styles: {
                fontSize: config.pdfFontSize,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: config.pdfHeaderColor,
                textColor: 255,
                fontStyle: 'bold',
            },
            margin: { top: 20 },
        });

        doc.save("data.pdf");
    }
};
