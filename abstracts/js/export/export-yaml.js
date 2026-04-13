/**
 * YAML Download Module
 * Handles exporting table data to YAML format.
 * Relies on js-yaml (jsyaml.dump) which is already loaded by index.html.
 */

const DownloadYAML = {
    /**
     * Download currently visible table data as a YAML file.
     * @param {Object} table - Tabulator instance
     */
    download(table) {
        const columns = table.getColumns();
        const data = table.getData("active");

        // Build plain objects using only the visible column fields so that
        // the output respects any column reordering the user has done.
        const rows = data.map(row => {
            const obj = {};
            columns.forEach(col => {
                const field = col.getDefinition().field;
                const value = row[field] ?? '';
                // Preserve numeric types where possible so YAML looks clean
                obj[field] = value === '' ? '' : (isNaN(value) ? value : Number(value) || value);
            });
            return obj;
        });

        const yaml = jsyaml.dump(rows, {
            indent: 2,
            lineWidth: 120,
            noRefs: true,
        });

        // Trigger browser download
        const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.yaml';
        a.click();
        URL.revokeObjectURL(url);
    }
};
