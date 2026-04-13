/**
 * Table Manager Module
 * Handles Tabulator table creation and management
 */

const TableManager = {
    table: null,

    /**
     * Create and initialize Tabulator table
     * @param {Array} headers - Column headers
     * @param {Array} data - Data rows
     */
    create(headers, data) {

        // Resolve visible columns and their order from config
        const orderedHeaders = config.visibleColumns.length
            ? config.visibleColumns.filter(h => headers.includes(h))
            : headers;

        // Enable config override of column widths
        const columns = orderedHeaders.map(header => ({
            title: header,
            field: header,
            sorter: "auto",
            headerFilter: config.nonFilterableColumns.includes(header) ? false : "input",
            widthGrow: config.columnWidthOverrides?.[header] ?? 1,
            tooltip: true,
        }));

        // Initialize Tabulator
        this.table = new Tabulator("#data-table", {
            data: data,
            columns: columns,
            layout: "fitColumns",
            responsiveLayout: false,
            pagination: true,
            paginationSize: config.paginationSize,
            paginationSizeSelector: config.paginationSizeOptions,
            paginationCounter: "rows",
            movableColumns: true,
            resizableColumnFit: true,
            initialSort: [
                { column: orderedHeaders[0], dir: "asc" }
            ],
            initialFilter: config.requiredFields.map(field => ({
                field: field,
                type: "!=",
                value: "",
            })),
            headerFilterLiveFilterDelay: 50,
            placeholder: "No matching data found",
        });

        // Setup button handlers
        this.setupButtonHandlers();

        // Hide loading, show table
        document.getElementById('empty-state').style.display = 'none';

        // Open row url (in csv field "url") in row click
        this.table.on("rowClick", (e, row) => {
            const url = row.getData().Url;
            if (url) window.open(url, '_blank');
        });
    },

    /**
     * Setup button click handlers
     */
    setupButtonHandlers() {
        // Clear filters button
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.table.clearHeaderFilter();
        });

        // Download buttons — guarded against rapid double-clicks
        const exportButtons = [
            { id: 'downloadCsv',  fn: () => DownloadCSV.download(this.table) },
            { id: 'downloadXlsx', fn: () => DownloadXLSX.download(this.table) },
            { id: 'downloadPdf',  fn: () => DownloadPDF.download(this.table) },
            { id: 'downloadJson', fn: () => DownloadJSON.download(this.table) },
            { id: 'downloadYaml', fn: () => DownloadYAML.download(this.table) },
        ];

        exportButtons.forEach(({ id, fn }) => {
            const btn = document.getElementById(id);
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                btn.disabled = true;
                try {
                    fn();
                } finally {
                    // Re-enable after a short delay (enough for the browser
                    // to start the file download before accepting another click)
                    setTimeout(() => { btn.disabled = false; }, 1500);
                }
            });
        });
    },

    /**
     * Get the current table instance
     * @returns {Object} Tabulator instance
     */
    getTable() {
        return this.table;
    },

    /**
     * Destroy and recreate table with new data
     * @param {Array} headers - Column headers
     * @param {Array} data - Data rows
     */
    reload(headers, data) {
        if (this.table) {
            this.table.destroy();
        }
        this.create(headers, data);
    }
};
