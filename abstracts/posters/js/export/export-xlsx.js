/**
 * XLSX Download Module
 * Handles exporting table data to styled Excel format
 */

const DownloadXLSX = {
    /**
     * Download table data as styled XLSX
     * @param {Object} table - Tabulator instance
     */
    download(table) {
        // Get filtered data from table
        const data = table.getData("active");
        const columns = table.getColumns();

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Prepare data array with headers
        const headers = columns.map(col => col.getDefinition().title);
        const rows = data.map(row =>
            columns.map(col => {
                const field = col.getDefinition().field;
                return row[field] ?? '';
            })
        );

        // Combine headers and data
        const wsData = [headers, ...rows];

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths (auto-size based on content)
        const colWidths = headers.map((header, i) => {
            const maxLength = Math.max(
                header.length,
                ...rows.map(row => String(row[i] || '').length)
            );
            return { wch: Math.min(maxLength + 2, config.xlsxMaxColumnWidth) };
        });
        ws['!cols'] = colWidths;

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(ws['!ref']);

        // Style the header row (row 0)
        this.styleHeaderRow(ws, range);

        // Style data rows (add borders and alternating colors)
        this.styleDataRows(ws, range);

        // Freeze the header row (first row)
        ws['!freeze'] = {
            xSplit: 0,
            ySplit: 1,
            topLeftCell: 'A2',
            activePane: 'bottomLeft',
            state: 'frozen'
        };

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Data");

        // Write file with cellStyles option
        XLSX.writeFile(wb, "data.xlsx", { cellStyles: true, bookType: 'xlsx' });
    },

    /**
     * Apply styling to header row
     * @param {Object} ws - Worksheet object
     * @param {Object} range - Cell range
     */
    styleHeaderRow(ws, range) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;

            ws[cellAddress].s = {
                font: {
                    bold: true,
                    color: { rgb: config.xlsxHeaderFontColor },
                    sz: 11,
                    name: "Arial"
                },
                fill: {
                    fgColor: { rgb: config.xlsxHeaderColor }
                },
                alignment: {
                    horizontal: "center",
                    vertical: "center"
                },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };
        }
    },

    /**
     * Apply styling to data rows
     * @param {Object} ws - Worksheet object
     * @param {Object} range - Cell range
     */
    styleDataRows(ws, range) {
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });

                // Initialize cell if it doesn't exist
                if (!ws[cellAddress]) {
                    ws[cellAddress] = { t: 's', v: '' };
                }

                // Create style object
                const style = {
                    border: {
                        top: { style: "thin", color: { rgb: config.xlsxBorderColor } },
                        bottom: { style: "thin", color: { rgb: config.xlsxBorderColor } },
                        left: { style: "thin", color: { rgb: config.xlsxBorderColor } },
                        right: { style: "thin", color: { rgb: config.xlsxBorderColor } }
                    },
                    alignment: {
                        vertical: "top",
                        wrapText: false
                    },
                    font: {
                        sz: 10,
                        name: "Arial"
                    }
                };

                // Alternate row coloring (every other row)
                if (row % 2 === 0) {
                    style.fill = { fgColor: { rgb: config.xlsxAlternateRowColor } };
                }

                ws[cellAddress].s = style;
            }
        }
    }
};
