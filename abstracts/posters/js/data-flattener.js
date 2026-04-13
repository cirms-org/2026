/**
 * Data Flattener Utility
 * Converts nested objects/arrays into flat tabular data suitable for Tabulator.
 * Shared by yaml-parser.js and json-parser.js.
 */

const DataFlattener = {
    /**
     * Flatten a nested object into a single-level object with dot-notation keys.
     * Arrays are joined as comma-separated strings.
     * @param {Object} obj - Nested object
     * @param {string} prefix - Key prefix for recursion
     * @returns {Object} - Flat object
     */
    flattenObject(obj, prefix = '') {
        const result = {};

        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value === null || value === undefined) {
                result[fullKey] = '';
            } else if (Array.isArray(value)) {
                // Arrays of primitives → comma-separated string
                // Arrays of objects → count indicator (too complex for a cell)
                if (value.length === 0) {
                    result[fullKey] = '';
                } else if (typeof value[0] === 'object' && value[0] !== null) {
                    result[fullKey] = `[${value.length} items]`;
                } else {
                    result[fullKey] = value.join(', ');
                }
            } else if (typeof value === 'object') {
                // Recurse into nested objects
                Object.assign(result, this.flattenObject(value, fullKey));
            } else {
                result[fullKey] = String(value);
            }
        }

        return result;
    },

    /**
     * Convert an array of (possibly nested) objects into {headers, data}
     * with all objects flattened and a unified set of column headers.
     * @param {Array<Object>} items - Array of objects (may be nested)
     * @returns {{headers: string[], data: Object[]}}
     */
    flatten(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { headers: [], data: [] };
        }

        // Flatten every row
        const flatRows = items.map(item =>
            (typeof item === 'object' && item !== null)
                ? this.flattenObject(item)
                : { value: String(item) }
        );

        // Collect all unique keys in insertion order across all rows
        const headerSet = new Set();
        flatRows.forEach(row => Object.keys(row).forEach(k => headerSet.add(k)));
        const headers = [...headerSet];

        // Normalize: every row gets every header (empty string if missing)
        const data = flatRows.map(row => {
            const normalized = {};
            headers.forEach(h => {
                normalized[h] = (row[h] !== undefined) ? row[h] : '';
            });
            return normalized;
        });

        return { headers, data };
    }
};
