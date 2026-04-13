/**
 * JSON Parser Module
 * Parses JSON text into tabular {headers, data}.
 * Handles arrays of objects, single objects, and nested structures.
 * Register with: ParserRegistry.register('json', JSONParser)
 */

const JSONParser = {
    /**
     * Parse JSON text into headers and data rows
     * @param {string} text - Raw JSON text
     * @returns {{headers: string[], data: Object[]}}
     */
    parse(text) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid JSON: ${e.message}`);
        }

        if (parsed === null || parsed === undefined) {
            return { headers: [], data: [] };
        }

        // Case 1: Array of items (most common tabular JSON)
        if (Array.isArray(parsed)) {
            return DataFlattener.flatten(parsed);
        }

        // Case 2: Single object — same logic as YAML parser
        if (typeof parsed === 'object') {
            const entries = Object.entries(parsed);

            // All-primitive values → key/value table
            const allPrimitive = entries.every(([, v]) =>
                v === null || typeof v !== 'object'
            );

            if (allPrimitive) {
                const headers = ['key', 'value'];
                const data = entries.map(([k, v]) => ({
                    key: k,
                    value: v === null ? '' : String(v)
                }));
                return { headers, data };
            }

            // Mixed/nested values → flatten each entry as a row
            const items = entries.map(([k, v]) => {
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    return { _name: k, ...v };
                }
                return { _name: k, value: Array.isArray(v) ? v.join(', ') : String(v ?? '') };
            });

            return DataFlattener.flatten(items);
        }

        // Case 3: Scalar JSON
        return { headers: ['value'], data: [{ value: String(parsed) }] };
    }
};
