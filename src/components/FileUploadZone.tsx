/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FileData } from '../types';
import { detectHeaderRow } from '../utils/excelProcessor';

interface FileUploadZoneProps {
  label: string;
  id: string;
  description: string;
  placeholder: string;
  file: FileData | null;
  onFileLoaded: (file: FileData) => void;
  onFileCleared: () => void;
  highlightColor?: string;
  iconName?: 'master' | 'reference';
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  label,
  id,
  description,
  placeholder,
  file,
  onFileLoaded,
  onFileCleared,
  highlightColor = 'indigo',
  iconName = 'master'
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (nativeFile: File) => {
    setIsLoading(true);
    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Không thể đọc dữ liệu file');

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse raw rows as 2D array
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (rawJson.length === 0) {
          throw new Error('Tệp tải lên rỗng, không tìm thấy dòng dữ liệu nào.');
        }

        const { index: headerRowIndex, headers } = detectHeaderRow(rawJson);
        
        // Calculate columns labels (A, B, C...) based on max row columns length
        let maxCols = 0;
        rawJson.forEach(row => {
          if (row && row.length > maxCols) maxCols = row.length;
        });
        
        const columnsList: string[] = [];
        for (let i = 0; i < Math.max(maxCols, 10); i++) {
          let letter = '';
          let temp = i;
          while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter;
            temp = Math.floor(temp / 26) - 1;
          }
          columnsList.push(letter);
        }

        onFileLoaded({
          name: nativeFile.name,
          size: nativeFile.size,
          type: nativeFile.type,
          rawRows: rawJson,
          sheetName: firstSheetName,
          columnsList,
          headers,
          headerRowIndex
        });
      } catch (err: any) {
        console.error(err);
        setError(`Lỗi xử lý file: ${err.message || 'vui lòng thử tệp hợp lệ.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Đã xảy ra lỗi khi đọc tệp từ ổ đĩa.');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(nativeFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        processFile(droppedFile);
      } else {
        setError('Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ .xlsx, .xls, .csv');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Border and focus ring configuration based on state and color choice
  const activeBorderColor = highlightColor === 'emerald' ? 'border-emerald-500 bg-emerald-50/40' : 'border-indigo-500 bg-indigo-50/40';
  const hoverBorderColor = highlightColor === 'emerald' ? 'hover:border-emerald-400 hover:bg-slate-50/50' : 'hover:border-indigo-400 hover:bg-slate-50/50';

  return (
    <div id={`zone-wrapper-${id}`} className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label id={`zone-label-${id}`} className="text-sm font-semibold text-slate-700 block">
          {label} <span className="text-rose-500">*</span>
        </label>
        {file && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            Phát hiện: {file.rawRows.length} dòng
          </span>
        )}
      </div>

      {!file ? (
        <div
          id={`dropzone-${id}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleZoneClick}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[190px] ${
            isDragActive 
              ? activeBorderColor 
              : `border-slate-200 bg-white ${hoverBorderColor}`
          }`}
        >
          <input
            id={`file-input-${id}`}
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-600 font-medium animate-pulse">Đang nạp và phân tích dữ liệu...</p>
            </div>
          ) : (
            <>
              <div className={`p-3 rounded-full mb-3 ${
                highlightColor === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {iconName === 'master' ? (
                  <FileSpreadsheet className="h-6 w-6" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <span className="font-semibold text-slate-800 text-sm mb-1">{placeholder}</span>
              <p className="text-xs text-slate-400 max-w-sm px-4 leading-normal">{description}</p>
            </>
          )}

          {error && (
            <div className="absolute bottom-2 left-2 right-2 p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-700 text-xs text-left">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="line-clamp-2">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div 
          id={`uploaded-card-${id}`}
          className={`flex items-center gap-4 bg-white border rounded-xl p-4 transition-all duration-300 ${
            highlightColor === 'emerald' ? 'border-emerald-200 shadow-sm shadow-emerald-50' : 'border-indigo-200 shadow-sm shadow-indigo-50'
          }`}
        >
          <div className={`p-3 rounded-xl shrink-0 ${
            highlightColor === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <FileSpreadsheet className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-800 block truncate" title={file.name}>
              {file.name}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-mono">{formatFileSize(file.size)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Đã nạp ({file.sheetName || 'Sheet1'})
              </span>
            </div>
          </div>

          <button
            id={`btn-clear-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              onFileCleared();
            }}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
            title="Gỡ bỏ tệp tin"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
