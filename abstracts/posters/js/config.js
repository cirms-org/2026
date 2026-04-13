/**
 * Configuration for Data Viewer
 * Modify these values to customize the application behavior
 */

const config = {

    // Page header
    title: 'CIRMS 2026 — Posters and Essays',
    subtitle: 'Annual Meeting  ·  April 13–15, 2026',

    // Load and download visibility options
    showLoadButton: false,
    showDownloadButtons: true,

    // Data file to load on startup (relative path)
    // Supported formats: .csv, .json, .yaml, .yml
    dataFileUrl: 'posters.csv',

    // Optional: define which columns to show and in what order.
    // Leave as empty array [] to show all columns in their natural order.
    visibleColumns: ['Type', 'Authors', 'Affiliation', 'Title'],

    // Records with empty values in any of these fields will be hidden.
    // Leave as empty array [] to show all records.
    requiredFields: [],

    // Optional: Set columns that should not be filterable
    nonFilterableColumns: [],

    // Table pagination settings
    paginationSize: 100,
    paginationSizeOptions: [10, 20, 50, 100, true],

    // XLSX Export styling
    xlsxHeaderColor: '5CA772',          // Green (hex without #)
    xlsxAlternateRowColor: 'F8F9FA',    // Light gray
    xlsxHeaderFontColor: 'FFFFFF',      // White
    xlsxBorderColor: 'D3D3D3',          // Light gray
    xlsxMaxColumnWidth: 50,

    // PDF Export settings
    pdfOrientation: 'landscape',
    pdfHeaderColor: [82, 128, 192],     // RGB blue
    pdfFontSize: 8,

    // HTML Export settings
    htmlHeaderClass: 'table-success',   // Bootstrap class for header
};
