/**
 * CSV Parser Module
 * Handles parsing CSV text into structured data.
 * Parses the full text in a single pass so that quoted fields
 * containing embedded newlines are handled correctly.
 */

const CSVParser = {
    /**
     * Parse CSV text into headers and data rows.
     * Operates on the raw text rather than pre-split lines so that
     * newlines inside quoted fields are preserved as part of the value.
     * @param {string} text - Raw CSV text
     * @returns {{headers: string[], data: Object[]}}
     */
    parse(text) {
        // Normalise line endings, strip a trailing newline so we don't
        // produce a phantom empty last row.
        const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
        if (!normalised) return { headers: [], data: [] };

        const rows = this.parseRows(normalised);
        if (rows.length === 0) return { headers: [], data: [] };

        const headers = rows[0];
        const data = [];

        for (let i = 1; i < rows.length; i++) {
            // Skip completely blank rows (e.g. trailing blank line)
            if (rows[i].length === 1 && rows[i][0] === '') continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = rows[i][index] ?? '';
            });
            data.push(row);
        }

        return { headers, data };
    },

    /**
     * Walk the raw CSV text character-by-character, emitting rows of fields.
     * Handles:
     *   - Quoted fields with embedded commas, newlines, and escaped quotes ("")
     *   - Unquoted fields (leading/trailing whitespace trimmed)
     * @param {string} text - Normalised CSV text (LF line endings, no trailing LF)
     * @returns {string[][]} - Array of rows, each row an array of field strings
     */
    parseRows(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        let i = 0;

        while (i < text.length) {
            const ch = text[i];
            const next = text[i + 1];

            if (inQuotes) {
                if (ch === '"' && next === '"') {
                    // Escaped quote inside a quoted field
                    field += '"';
                    i += 2;
                } else if (ch === '"') {
                    // Closing quote
                    inQuotes = false;
                    i++;
                } else {
                    // Any character (including \n) inside a quoted field
                    field += ch;
                    i++;
                }
            } else {
                if (ch === '"') {
                    // Opening quote — must be at the start of a field
                    inQuotes = true;
                    i++;
                } else if (ch === ',') {
                    row.push(field.trim());
                    field = '';
                    i++;
                } else if (ch === '\n') {
                    row.push(field.trim());
                    rows.push(row);
                    row = [];
                    field = '';
                    i++;
                } else {
                    field += ch;
                    i++;
                }
            }
        }

        // Push the last field / row
        row.push(field.trim());
        rows.push(row);

        return rows;
    }
};
