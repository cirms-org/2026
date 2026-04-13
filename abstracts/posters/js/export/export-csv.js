/**
 * CSV Download Module
 * Handles exporting table data to CSV format
 */

const DownloadCSV = {
    /**
     * Download table data as CSV
     * @param {Object} table - Tabulator instance
     */
    download(table) {
        table.download("csv", "data.csv");
    }
};
