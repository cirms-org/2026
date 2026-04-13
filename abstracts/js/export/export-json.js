/**
 * JSON Download Module
 * Handles exporting table data to JSON format
 */

const DownloadJSON = {
    /**
     * Download table data as JSON
     * @param {Object} table - Tabulator instance
     */
    download(table) {
        table.download("json", "data.json");
    }
};
