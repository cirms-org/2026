/**
 * File Loader Module
 * Handles loading data files from URL or local file upload.
 * Delegates format detection and parsing to ParserRegistry.
 */

const FileLoader = {
    /**
     * Load and parse a data file from URL
     * @param {string} url - URL of data file
     */
    async loadFromURL(url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();
            const { headers, data } = ParserRegistry.parse(text, url);

            if (headers.length === 0 || data.length === 0) {
                throw new Error('File is empty or contains no tabular data');
            }

            TableManager.create(headers, data);

        } catch (error) {
            // Silently ignore — empty state is already visible
            console.log('No default file found, awaiting user upload:', error);
        }
    },

    /**
     * Load and parse a local file
     * @param {File} file - File object from input
     */
    loadFromFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const { headers, data } = ParserRegistry.parse(text, file.name);

                if (headers.length === 0 || data.length === 0) {
                    alert('File is empty or contains no tabular data.');
                    return;
                }

                // Clear any existing error messages
                document.getElementById('error').style.display = 'none';

                // Reload table with new data
                TableManager.reload(headers, data);

            } catch (error) {
                alert(error.message);
            }
        };

        reader.onerror = () => {
            alert('Error reading file');
        };

        reader.readAsText(file);
    },

    /**
     * Initialize file upload button handlers
     */
    initFileUpload() {
        const loadButton = document.getElementById('loadFile');
        const fileInput = document.getElementById('fileInput');

        // Update accept attribute dynamically from registry
        const extensions = ParserRegistry.supportedExtensions().map(e => `.${e}`).join(',');
        fileInput.setAttribute('accept', extensions);

        // Load file button - trigger file input
        loadButton.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadFromFile(file);
                // Reset input so same file can be loaded again
                e.target.value = '';
            }
        });
    }
};
