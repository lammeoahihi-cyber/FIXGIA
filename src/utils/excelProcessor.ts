/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { FileData, NewPriceRef, ProcessedItem, ProcessingResult, ColumnMappingConfig } from '../types';

/**
 * Converted number to Excel Column Letter (0 = A, 1 = B, etc.)
 */
export function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Returns clean price displaying no trailing .00
 */
export function cleanPriceDecimal(val: any): string | number | null {
  if (val === undefined || val === null || val === '') return null;
  const valStr = String(val).trim();
  
  // Rule: strip trailing .00 completely to make it looks clean integer
  if (valStr.endsWith('.00')) {
    const cleaned = valStr.slice(0, -3);
    const num = Number(cleaned);
    return isNaN(num) ? cleaned : num;
  }
  
  // If it's a number ending with .0
  if (valStr.endsWith('.0')) {
    const cleaned = valStr.slice(0, -2);
    const num = Number(cleaned);
    return isNaN(num) ? cleaned : num;
  }

  // If it can be interpreted as a raw integer, parse it as integer first
  const parsedNum = Number(valStr);
  if (!isNaN(parsedNum) && Number.isInteger(parsedNum)) {
    return parsedNum;
  }
  
  return valStr;
}

/**
 * Normalise SKU for accurate matching (remove spaces, convert to lowercase)
 */
export function normalizeSku(sku: any): string {
  if (sku === undefined || sku === null) return '';
  return String(sku).trim().toLowerCase();
}

/**
 * Smart matching for SKU supporting strict case-insensitive match on trimmed SKU.
 * This guarantees perfect accuracy without false positives from partial prefix similarity.
 */
export function findBestSkuMatch(
  sourceSkuRaw: string,
  refMap: Map<string, any>
): { matchedSku: string; value: any } | null {
  const sourceSku = normalizeSku(sourceSkuRaw);
  if (!sourceSku) return null;

  // 1. Exact case-insensitive match after trimming
  if (refMap.has(sourceSku)) {
    return { matchedSku: sourceSku, value: refMap.get(sourceSku) };
  }

  return null;
}

/**
 * Smart detection of headers in a 2D sheet array
 */
export function detectHeaderRow(rawRows: any[][]): { index: number; headers: string[] } {
  // We search the first 12 rows for standard header keywords
  const keywords = ['sku', 'phân loại', 'giá gốc', 'giá đã giảm', 'giá bán', 'mã', 'product', 'price', 'gốc', 'giảm'];
  
  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;
    
    // Check if this row contains any of our key terms
    let score = 0;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase();
      if (keywords.some(kw => val.includes(kw))) {
        score++;
      }
    }
    
    // If we have a high confident header row (multiple metadata matching)
    if (score >= 2) {
      return { index: r, headers: row.map(v => String(v || '')) };
    }
  }
  
  // Fallback to row index 0
  if (rawRows.length > 0) {
    return { index: 0, headers: rawRows[0].map(v => String(v || '')) };
  }
  
  return { index: 0, headers: [] };
}

/**
 * Autodetect columns configuration in source sheet
 */
export function autoDetectSourceColumns(headers: string[]): { skuCol: number; priceGCol: number; priceHCol: number } {
  let skuCol = 5; // Column F (index 5)
  let priceGCol = 6; // Column G (index 6)
  let priceHCol = 7; // Column H (index 7)

  // Try to find by text matching
  headers.forEach((h, idx) => {
    const text = h.toLowerCase().trim();
    if (text.includes('sku') || text.includes('mã hàng') || text.includes('mã sản phẩm') || text.includes('mã phân loại')) {
      skuCol = idx;
    } else if (text.includes('giá gốc') || (text.includes('gốc') && text.includes('giá'))) {
      priceGCol = idx;
    } else if (text.includes('giá đã giảm') || text.includes('giá bán') || text.includes('giá khuyến mãi') || text.includes('giảm giá') || text.includes('giá mới')) {
      priceHCol = idx;
    }
  });

  return { skuCol, priceGCol, priceHCol };
}

/**
 * Autodetect columns configuration in reference price sheet
 */
export function autoDetectRefColumns(headers: string[]): { skuCol: number; priceCol: number } {
  let skuCol = 0;
  let priceCol = 1;

  headers.forEach((h, idx) => {
    const text = h.toLowerCase().trim();
    if (text.includes('sku') || text.includes('mã') || text.includes('mã hàng') || text.includes('mã định danh')) {
      skuCol = idx;
    } else if (text.includes('giá mới') || text.includes('giá cập nhật') || text.includes('giá') || text.includes('price') || text.includes('mới')) {
      priceCol = idx;
    }
  });

  return { skuCol, priceCol };
}

/**
 * Main processor function matching source & reference datasets
 */
export function processSheets(
  sourceFile: FileData,
  refFile: FileData,
  config: ColumnMappingConfig
): ProcessingResult {
  const resultRows: any[][] = [];
  const processedItems: ProcessedItem[] = [];
  
  // Clone the raw rows to prevent modifying state directly
  const rawRows = sourceFile.rawRows.map(row => [...row]);
  const headerIdx = sourceFile.headerRowIndex;

  // Compile the reference database for fast SKU lookup
  const refMap = new Map<string, any>();
  const refHeaderIdx = refFile.headerRowIndex;
  
  // Read pricing dataset
  for (let r = refHeaderIdx + 1; r < refFile.rawRows.length; r++) {
    const row = refFile.rawRows[r];
    if (!row || row.length === 0) continue;
    
    const skuRaw = row[config.refSkuCol];
    const priceRaw = row[config.refPriceCol];
    
    if (skuRaw !== undefined && skuRaw !== null && skuRaw !== '') {
      const cleanSkuKey = normalizeSku(skuRaw);
      const cleanPrice = cleanPriceDecimal(priceRaw);
      if (cleanSkuKey && cleanPrice !== null) {
        refMap.set(cleanSkuKey, cleanPrice);
      }
    }
  }

  // Pre-populate original content before the header row exactly as-is
  for (let r = 0; r <= headerIdx; r++) {
    resultRows.push([...rawRows[r]]);
  }

  // Process data rows
  let matchingCount = 0;
  let notMatchingCount = 0;

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const curRow = [...rawRows[r]];
    // Make sure row is padded to accommodate values
    const maxCols = Math.max(curRow.length, config.sourcePriceHCol + 1, config.sourcePriceGCol + 1, config.sourceSkuCol + 1);
    while (curRow.length < maxCols) {
      curRow.push('');
    }

    const skuRaw = curRow[config.sourceSkuCol];
    const skuCleanKey = normalizeSku(skuRaw);

    // Baseline G & H column normalization
    const originalG = curRow[config.sourcePriceGCol];
    const originalH = curRow[config.sourcePriceHCol];

    const cleanG = cleanPriceDecimal(originalG);
    const cleanH = cleanPriceDecimal(originalH);

    // Apply baseline .00 stripping to G & H
    curRow[config.sourcePriceGCol] = cleanG !== null ? cleanG : '';
    curRow[config.sourcePriceHCol] = cleanH !== null ? cleanH : '';

    let status: 'FOUND' | 'NOT_FOUND' = 'NOT_FOUND';
    let finalH = cleanH;
    let matchedSku: string | undefined = undefined;

    const matched = skuRaw ? findBestSkuMatch(skuRaw, refMap) : null;

    if (matched) {
      status = 'FOUND';
      finalH = matched.value;
      matchedSku = matched.matchedSku;
      curRow[config.sourcePriceHCol] = finalH; // Sửa cột H thành giá mới
      matchingCount++;
    } else {
      status = 'NOT_FOUND';
      notMatchingCount++;
    }

    processedItems.push({
      id: `row-${r}`,
      sku: skuRaw ? String(skuRaw).trim() : '',
      matchedSku,
      originalPriceG: cleanG,
      originalPriceH: cleanH,
      newPriceH: finalH,
      status,
      rowNumber: r + 1,
      originalRowData: rawRows[r],
    });

    resultRows.push(curRow);
  }

  return {
    totalScannedRows: processedItems.length,
    matchingCount,
    notMatchingCount,
    processedItems,
    outputRows: resultRows
  };
}

/**
 * Generate workbook binary output as File_Ket_Qua
 */
export function generateResultWorkbook(output2DRows: any[][], fileName: string): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(output2DRows);
  
  XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Gia_Moi');
  
  const wopts: XLSX.WritingOptions = {
    bookType: fileName.endsWith('.csv') ? 'csv' : 'xlsx',
    type: 'array'
  };
  
  return XLSX.write(wb, wopts);
}

/**
 * Generate secondary check workbook (File_Doi_Chieu_Ma.xlsx) with 2 sheets
 */
export function generateComparisonWorkbook(
  processedItems: ProcessedItem[],
  refFile: FileData,
  config: ColumnMappingConfig
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Create set of matched reference SKUs to quickly check status
  const matchedRefSkuKeys = new Set(
    processedItems
      .filter(item => item.status === 'FOUND' && item.matchedSku)
      .map(item => normalizeSku(item.matchedSku))
  );

  // 1. Create sheet: TỔNG HỢP FILE GIÁ MỚI (All products from the new price reference file with Match status)
  const refSummaryHeaders = [
    'Dòng (File Giá Mới)',
    'Mã SKU Giá Mới',
    'Giá Mới Đề Xuất',
    'Trạng Thái',
    'Chi Tiết Đối Chiếu Trong File Gốc'
  ];
  const refSummaryRows: any[][] = [refSummaryHeaders];
  const refHeaderIdx = refFile.headerRowIndex;

  for (let r = refHeaderIdx + 1; r < refFile.rawRows.length; r++) {
    const row = refFile.rawRows[r];
    if (!row || row.length === 0) continue;

    const skuRaw = row[config.refSkuCol];
    const priceRaw = row[config.refPriceCol];
    const skuKey = normalizeSku(skuRaw);

    if (skuRaw !== undefined && skuRaw !== null && skuRaw !== '') {
      const isFound = matchedRefSkuKeys.has(skuKey);
      
      // Get detail list of matching lines in original file
      const matchingOriginalItems = processedItems.filter(
        item => item.status === 'FOUND' && item.matchedSku && normalizeSku(item.matchedSku) === skuKey
      );

      let details = '';
      if (isFound) {
        const detailsArr = matchingOriginalItems.map(
          item => `Dòng #${item.rowNumber} (Mã gốc: "${item.sku}")`
        );
        details = `Khớp thành công với ${matchingOriginalItems.length} sản phẩm gốc: ${detailsArr.join(', ')}`;
      } else {
        details = 'Không tìm thấy mã này trong bất kỳ dòng sản phẩm nào của File Gốc';
      }

      refSummaryRows.push([
        r + 1,
        String(skuRaw).trim(),
        cleanPriceDecimal(priceRaw),
        isFound ? 'ĐÃ TÌM THẤY & CẬP NHẬT' : 'CHƯA TÌM THẤY TRONG FILE GỐC',
        details
      ]);
    }
  }

  const wsRefSummary = XLSX.utils.aoa_to_sheet(refSummaryRows);
  XLSX.utils.book_append_sheet(wb, wsRefSummary, 'Tổng Hợp File Giá Mới');

  // Sheet 2: Danh sách ĐÃ tìm thấy (from File Gốc perspective)
  const foundHeaders = ['Dòng Gốc', 'Mã SKU gốc', 'SKU Giá Mới Khớp', 'Giá Gốc Cũ (G)', 'Giá Khuyến Mãi Cũ (H)', 'Giá Khuyến Mãi Mới (H)'];
  const foundRows: any[][] = [foundHeaders];

  processedItems.filter(item => item.status === 'FOUND').forEach(item => {
    foundRows.push([
      item.rowNumber,
      item.sku,
      item.matchedSku ? item.matchedSku.toUpperCase() : '',
      item.originalPriceG,
      item.originalPriceH,
      item.newPriceH
    ]);
  });

  const wsFound = XLSX.utils.aoa_to_sheet(foundRows);
  XLSX.utils.book_append_sheet(wb, wsFound, 'Đã Tìm Thấy SKU');

  // Sheet 3: Danh sách CHƯA tìm thấy (unmatched items from both files)
  const notFoundHeaders = ['Nguồn gốc', 'Dòng', 'Mã SKU', 'Giá bán hiện tại / Giá mới đề xuất', 'Mô tả chi tiết'];
  const notFoundRows: any[][] = [notFoundHeaders];

  // 1. SKU inside File Gốc but NOT inside File Giá Mới
  processedItems.filter(item => item.status === 'NOT_FOUND').forEach(item => {
    if (item.sku) {
      notFoundRows.push([
        'File Gốc',
        item.rowNumber,
        item.sku,
        item.originalPriceH,
        'Mã SKU này không tồn tại trong Tệp Giá Mới đối chiếu'
      ]);
    }
  });

  // 2. SKU inside File Giá Mới but NOT inside File Gốc
  for (let r = refHeaderIdx + 1; r < refFile.rawRows.length; r++) {
    const row = refFile.rawRows[r];
    if (!row || row.length === 0) continue;
    
    const skuRaw = row[config.refSkuCol];
    const priceRaw = row[config.refPriceCol];
    const skuKey = normalizeSku(skuRaw);
    
    if (skuKey && !matchedRefSkuKeys.has(skuKey)) {
      notFoundRows.push([
        'File Giá Mới',
        r + 1,
        skuRaw ? String(skuRaw).trim() : '',
        cleanPriceDecimal(priceRaw),
        'Có trong bảng Giá Mới nhưng không được dán vào bất cứ dòng nào của File Gốc'
      ]);
    }
  }

  const wsNotFound = XLSX.utils.aoa_to_sheet(notFoundRows);
  XLSX.utils.book_append_sheet(wb, wsNotFound, 'Chưa Tìm Thấy SKU');

  const wopts: XLSX.WritingOptions = {
    bookType: 'xlsx',
    type: 'array'
  };

  return XLSX.write(wb, wopts);
}

/**
 * Generate mockup file arrays for quick onboarding demo
 */
export function createMockupFiles(): { sourceFile: FileData; refFile: FileData } {
  // Shopee-like template with 3 empty alert info rows, 1 header row, and some products
  const sourceRaw: any[][] = [
    ['# [Shopee] CÔNG CỤ ĐĂNG SẢN PHẨM HOÀNG LOẠT'],
    ['# Hãy đảm bảo điền đúng mã định danh SKU trước khi tải lên cửa hàng'],
    ['Mã Sản phẩm', 'Tên phân loại', 'Thông tin kho', 'Mã SKU', 'Giá gốc', 'Giá khuyến mại'], // Simulated row 2
    ['SP001', 'Áo thun Polo Cotton M', 'Còn hàng', 'POLO-COT-M-BLK', '280000.00', '250000.00'],
    ['SP001', 'Áo thun Polo Cotton L', 'Còn hàng', 'POLO-COT-L-BLK', '280000.00', '250000.00'],
    ['SP002', 'Quần Jean Slimfit 30', 'Còn hàng', 'JEAN-SLIM-30-BLU', '450000.10', '390000.00'], // check decimal
    ['SP002', 'Quần Jean Slimfit 32', 'Hết hàng', 'JEAN-SLIM-32-BLU', '450000.00', '390000.00'],
    ['SP003', 'Giày Sneakers Sport 41', 'Còn hàng', 'SNEAK-SPORT-41', '1250000.00', '1100000.00'],
    ['SP003', 'Giày Sneakers Sport 42', 'Còn hàng', 'SNEAK-SPORT-42', '1250000.00', '1100000.00'],
    ['SP004', 'Mũ Lưỡi Trai Classic DT', 'Còn hàng', 'CAP-CLASSIC-WHT', '150000.00', '120000.00']
  ];

  // We intentionally construct it so Column F is Column index 3, G is 4, H is 5 to simulate Shopee style column matching.
  // Wait, let's inject empty columns so SKU falls exactly on Column F (index 5), G (index 6), H (index 7).
  const paddingSourceRaw = sourceRaw.map((row, idx) => {
    if (idx < 2) return row;
    // pad columns
    return [
      row[0], // A
      row[1], // B
      row[2], // C
      '', // D
      '', // E
      row[3], // F (SKU)
      row[4], // G (Giá Gốc)
      row[5], // H (Giá Đã Giảm)
      'Sản Phẩm Thời Trang Nam' // I
    ];
  });

  // Let's modify headers at row 2 so headers look realistic
  paddingSourceRaw[2] = ['', '', '', '', '', 'Số SKU Phân loại hàng (Tùy chọn)', 'Giá gốc (Tùy chọn)', 'Giá đã giảm', 'Danh mục'];

  const refRaw: any[][] = [
    ['Mã SKU', 'Giá Mới'],
    ['POLO-COT-M-BLK', '230000.00'], // Updated to 230000
    ['POLO-COT-L-BLK', '245000.00'], // Updated to 245000
    ['JEAN-SLIM-30-BLU', '375000'], // Updated to 375000 (already integer)
    // JEAN-SLIM-32-BLU not found (retains 390000)
    ['SNEAK-SPORT-41', '1050000.00'], // Updated to 1050000 exactly!
    ['CAP-CLASSIC-WHT', '99000.00'], // Updated to 99000
    ['SP-UNKNOWN-EXTRA', '88000.00'] // Non-matching SKU in ref to test "Chưa tìm thấy SKU" secondary sheet
  ];

  return {
    sourceFile: {
      name: 'File_Goc_Mau_San_Pham.xlsx',
      size: 15420,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      rawRows: paddingSourceRaw,
      sheetName: 'Products',
      columnsList: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      headers: paddingSourceRaw[2] as string[],
      headerRowIndex: 2
    },
    refFile: {
      name: 'File_Gia_Moi_Doi_Chieu.xlsx',
      size: 9840,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      rawRows: refRaw,
      sheetName: 'Sheet1',
      columnsList: ['A', 'B'],
      headers: refRaw[0],
      headerRowIndex: 0
    }
  };
}
