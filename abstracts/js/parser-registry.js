/**
 * Parser Registry Module
 * Maps file extensions to the appropriate parser.
 * To add a new format, register it with: ParserRegistry.register('ext', ParserObject)
 */

const ParserRegistry = {
    /** @type {Object<string, {parse: function(string): {headers: Array, data: Array}}>} */
    parsers: {},

    /**
     * Register a parser for a file extension
     * @param {string} extension - File extension without dot (e.g. 'csv', 'yaml')
     * @param {Object} parser - Parser object with a parse(text) method
     */
    register(extension, parser) {
        this.parsers[extension.toLowerCase()] = parser;
    },

    /**
     * Get the list of supported extensions (for UI / file input accept)
     * @returns {string[]}
     */
    supportedExtensions() {
        return Object.keys(this.parsers);
    },

    /**
     * Extract extension from a filename or URL
     * @param {string} filename
     * @returns {string|null} - Lowercase extension without dot, or null
     */
    getExtension(filename) {
        const match = filename.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
        return match ? match[1].toLowerCase() : null;
    },

    /**
     * Parse text using the parser matched to the given filename's extension.
     * @param {string} text - Raw file content
     * @param {string} filename - Filename or URL (used to detect extension)
     * @returns {{headers: Array, data: Array}}
     * @throws {Error} If extension is missing or unsupported
     */
    parse(text, filename) {
        const ext = this.getExtension(filename);

        if (!ext) {
            throw new Error(this.unsupportedMessage(filename, '(no extension)'));
        }

        const parser = this.parsers[ext];
        if (!parser) {
            throw new Error(this.unsupportedMessage(filename, `.${ext}`));
        }

        return parser.parse(text);
    },

    /**
     * Build a helpful error message listing supported formats
     * @param {string} filename
     * @param {string} detectedExt
     * @returns {string}
     */
    unsupportedMessage(filename, detectedExt) {
        const supported = this.supportedExtensions().map(e => `.${e}`).join(', ');
        return `Unsupported file format "${detectedExt}" for "${filename}".\n\n` +
            `Supported formats: ${supported}\n\n` +
            `Please rename your file with the correct extension so the viewer knows how to parse it.`;
    }
};
