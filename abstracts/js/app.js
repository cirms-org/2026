/**
 * Main Application
 * Initializes the data viewer application
 */

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {

    // Set title and subtitle
    document.getElementById('page-title').textContent = config.title;
    document.getElementById('page-subtitle').textContent = config.subtitle;

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

if (config.dataSets && config.dataSets.length) {
    const dataSetContainer = document.getElementById('data-sets');
    dataSetContainer.className = 'mt-3 d-flex gap-2';
    config.dataSets.forEach(ds => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-secondary flex-fill';
        btn.textContent = ds.label;
        btn.onclick = () => {
            dataSetContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const old = document.getElementById('dataset-config');
            if (old) old.remove();

            const script = document.createElement('script');
            script.id = 'dataset-config';
            script.src = ds.config;
            script.onload = () => FileLoader.loadFromURL(config.dataFileUrl);
            document.head.appendChild(script);
        };
        dataSetContainer.appendChild(btn);
    });
    dataSetContainer.querySelector('button').click();
}
});
