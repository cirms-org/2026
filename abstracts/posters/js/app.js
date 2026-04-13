/**
 * Main Application
 * Initializes the data viewer application
 */

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {

    // Register format parsers
    ParserRegistry.register('csv', CSVParser);
    ParserRegistry.register('json', JSONParser);
    ParserRegistry.register('yaml', YAMLParser);
    ParserRegistry.register('yml', YAMLParser);

    // Set visibility of load and download buttons according to config
    if (config.showLoadButton) {
        document.getElementById('loadFile').classList.remove('d-none');
    }
    if (config.showDownloadButtons) {
        document.getElementById('downloadButtons').classList.remove('d-none');
    }

    // Initialize file upload functionality
    FileLoader.initFileUpload();

    // Attempt to load default data file
    FileLoader.loadFromURL(config.dataFileUrl);

    document.getElementById('page-title').textContent = config.title;
    document.getElementById('page-subtitle').textContent = config.subtitle;
});
