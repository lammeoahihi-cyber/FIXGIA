/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FileData {
  name: string;
  size: number;
  type: string;
  rawRows: any[][]; // Row raw arrays parsed from excel/csv
  sheetName?: string;
  columnsList: string[]; // List of columns labels (A, B, C...) or strings
  headers: string[]; // Actual detected header text row
  headerRowIndex: number; // Row index of headers
}

export interface NewPriceRef {
  sku: string;
  price: number | string;
}

export interface ProcessedItem {
  id: string;
  sku: string;
  matchedSku?: string; // The selected matched reference SKU if any
  originalPriceG: number | string | null; // Cột G (Giá gốc)
  originalPriceH: number | string | null; // Cột H (Giá đã giảm)
  newPriceH: number | string | null; // Cột H đã được cập nhật giá mới
  status: 'FOUND' | 'NOT_FOUND';
  rowNumber: number; // 1-based Row number in File Gốc (including headers)
  originalRowData: any[]; // The complete row from the original sheet
}

export interface ProcessingResult {
  totalScannedRows: number;
  matchingCount: number;
  notMatchingCount: number;
  processedItems: ProcessedItem[];
  outputRows: any[][]; // Final 2D arrays to write to File_Ket_Qua
}

export interface ColumnMappingConfig {
  sourceSkuCol: number; // Column F default is 5
  sourcePriceGCol: number; // Column G default is 6
  sourcePriceHCol: number; // Column H default is 7
  
  refSkuCol: number; // Column index for SKU in File Giá Mới
  refPriceCol: number; // Column index for Price in File Giá Mới
  
  hasCustomMapping: boolean;
}

export interface ProcessingLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}
