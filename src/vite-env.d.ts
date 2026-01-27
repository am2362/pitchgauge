/// <reference types="vite/client" />

// ExcelJS browser build used to avoid Node.js polyfills in Vite.
// Re-export types from the main package for TypeScript.
declare module 'exceljs/dist/exceljs.min.js' {
  import ExcelJS from 'exceljs';
  export * from 'exceljs';
  export default ExcelJS;
}
