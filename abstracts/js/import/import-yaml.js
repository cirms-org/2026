/**
 * YAML Parser Module
 * Parses YAML text into tabular {headers, data} using js-yaml.
 * Handles both arrays of objects and single-object YAML files.
 * Register with: ParserRegistry.register('yaml', YAMLParser)
 */

const YAMLParser = {
    /**
     * Parse YAML text into headers and data rows
     * @param {string} text - Raw YAML text
     * @returns {{headers: string[], data: Object[]}}
     */
    parse(text) {
        if (typeof jsyaml === 'undefined') {
            throw new Error('js-yaml library is not loaded. Check that the CDN script is included.');
        }

        const parsed = jsyaml.load(text);

        if (parsed === null || parsed === undefined) {
            return { headers: [], data: [] };
        }

        // Case 1: Array of items (most common tabular YAML)
        if (Array.isArray(parsed)) {
            return DataFlattener.flatten(parsed);
        }

        // Case 2: Single object — treat top-level keys as rows
        // e.g. { server: {host: ..., port: ...}, db: {host: ..., port: ...} }
        // becomes rows with a "key" column + flattened value columns
        if (typeof parsed === 'object') {
            const entries = Object.entries(parsed);

            // Check if values are all primitives → simple key/value table
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

            // Values are objects/arrays → flatten each, prefixed by top-level key
            const items = entries.map(([k, v]) => {
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    return { _name: k, ...v };
                }
                return { _name: k, value: Array.isArray(v) ? v.join(', ') : String(v ?? '') };
            });

            return DataFlattener.flatten(items);
        }

        // Case 3: Scalar YAML (just a string/number) — edge case
        return { headers: ['value'], data: [{ value: String(parsed) }] };
    }
};
