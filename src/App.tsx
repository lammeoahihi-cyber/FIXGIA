/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  Terminal, 
  Play, 
  BookOpen, 
  CheckCircle, 
  Info, 
  ArrowRightLeft,
  ChevronRight,
  Database,
  Lock
} from 'lucide-react';

import { ColumnMappingConfig, FileData, ProcessingLog, ProcessingResult } from './types';
import { FileUploadZone } from './components/FileUploadZone';
import { MappingSettings } from './components/MappingSettings';
import { StatsDashboard } from './components/StatsDashboard';
import { MatchTable } from './components/MatchTable';
import { PythonScriptBox } from './components/PythonScriptBox';
import { 
  processSheets, 
  generateResultWorkbook, 
  generateComparisonWorkbook, 
  createMockupFiles,
  autoDetectSourceColumns,
  autoDetectRefColumns
} from './utils/excelProcessor';

export default function App() {
  // --- LOGIC KHÓA TRANG WEB ---
  // Thay đổi mã khóa bí mật của bạn ở đây
  const SECRET_CODE = 'ma_khoa_cua_ban_123'; 

  const [isAuthorized, setIsAuthorized] = useState<boolean>(
    localStorage.getItem('site_access_granted') === 'true'
  );
  const [inputPassword, setInputPassword] = useState('');
  const [lockError, setLockError] = useState('');

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === SECRET_CODE) {
      localStorage.setItem('site_access_granted', 'true');
      setIsAuthorized(true);
      setLockError('');
    } else {
      setLockError('Mã khóa không chính xác. Vui lòng thử lại!');
    }
  };

  // Input spreadsheets
  const [sourceFile, setSourceFile] = useState<FileData | null>(null);
  const [refFile, setRefFile] = useState<FileData | null>(null);

  // Column matching setting state
  const [columnConfig, setColumnConfig] = useState<ColumnMappingConfig>({
    sourceSkuCol: 5,     // Column F
    sourcePriceGCol: 6,  // Column G
    sourcePriceHCol: 7,  // Column H
    refSkuCol: 0,        // Column A
    refPriceCol: 1,      // Column B
    hasCustomMapping: false
  });

  // Outputs state
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Real-time operations logs
  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLogs(prev => [{ timestamp: time, message, type }, ...prev]);
  };

  const handleSourceFileLoaded = (file: FileData) => {
    setSourceFile(file);
    const autodetect = autoDetectSourceColumns(file.headers);
    setColumnConfig(prev => ({
      ...prev,
      sourceSkuCol: autodetect.skuCol,
      sourcePriceGCol: autodetect.priceGCol,
      sourcePriceHCol: autodetect.priceHCol,
    }));
    addLog(`Đã tải Tệp Gốc: "${file.name}" | Định dạng: ${file.sheetName || 'Chính'}. Đầu dòng bảng định vị tại dòng thứ ${file.headerRowIndex + 1}.`, 'success');
  };

  const handleRefFileLoaded = (file: FileData) => {
    setRefFile(file);
    const autodetect = autoDetectRefColumns(file.headers);
    setColumnConfig(prev => ({
      ...prev,
      refSkuCol: autodetect.skuCol,
      refPriceCol: autodetect.priceCol,
    }));
    addLog(`Đã tải Tệp Giá Mới: "${file.name}" | Đối chiếu SKU ở Cột ${(autodetect.skuCol + 1)} và giá mới ở Cột ${(autodetect.priceCol + 1)}.`, 'success');
  };

  const handleLoadSampleData = () => {
    const { sourceFile: mockSource, refFile: mockRef } = createMockupFiles();
    setSourceFile(mockSource);
    setRefFile(mockRef);
    setColumnConfig({
      sourceSkuCol: mockSource.headerRowIndex === -1 ? 5 : mockSource.headerRowIndex,
      sourcePriceGCol: 6,
      sourcePriceHCol: 7,
      refSkuCol: 0,
      refPriceCol: 1,
      hasCustomMapping: false
    });
    setResult(null);
    setLogs([]);
    addLog('Đã nạp bộ dữ liệu mẫu Shopee giả định thành công. Bạn có thể bấm xử lý ngay!', 'success');
  };

  const handleClearAll = () => {
    setSourceFile(null);
    setRefFile(null);
    setResult(null);
    setLogs([]);
    setColumnConfig({
      sourceSkuCol: 5,
      sourcePriceGCol: 6,
      sourcePriceHCol: 7,
      refSkuCol: 0,
      refPriceCol: 1,
      hasCustomMapping: false
    });
  };

  const runMatchingAlgorithm = () => {
    if (!sourceFile || !refFile) {
      addLog('Lỗi: Cần tải lên đầy đủ hai tệp tin để thực hiện.', 'error');
      return;
    }

    setIsProcessing(true);
    addLog('Bắt đầu quy trình xử lý và đối chiếu giá...', 'info');

    setTimeout(() => {
      try {
        const computation = processSheets(sourceFile, refFile, columnConfig);
        setResult(computation);
        addLog(`Hoàn thành chuẩn hóa! Khử đuôi .00 trên cột G và H thành công.`, 'success');
        addLog(`Tra soát kết quả: Khớp thành công ${computation.matchingCount} mã SKU. Giữ nguyên ${computation.notMatchingCount} mã.`, 'success');
        addLog(`Đã sẵn sàng tải xuống tệp kết quả.`, 'info');
      } catch (err: any) {
        addLog(`Đã gặp lỗi nghiêm trọng khi xử lý: ${err.message || err}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    }, 600);
  };

  const downloadResultFile = () => {
    if (!result || !sourceFile) return;
    try {
      const outputName = sourceFile.name.replace(/\.[^/.]+$/, '_Ket_Qua.xlsx');
      const binData = generateResultWorkbook(result.outputRows, outputName);
      
      const blob = new Blob([binData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog(`Đã tải xuống thành công file cập nhật giá: ${outputName}`, 'success');
    } catch (err) {
      addLog('Không thể kết xuất dữ liệu file kết quả.', 'error');
    }
  };

  const downloadComparisonFile = () => {
    if (!result || !refFile) return;
    try {
      const outputName = 'File_Doi_Chieu_Ma.xlsx';
      const binData = generateComparisonWorkbook(result.processedItems, refFile, columnConfig);
      
      const blob = new Blob([binData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog(`Đã tải xuống thành công file chi tiết đối chiếu: ${outputName}`, 'success');
    } catch (err) {
      addLog('Không thể kết xuất dữ liệu file đối chiếu đối soát.', 'error');
    }
  };

  // GIAO DIỆN MÀN HÌNH KHÓA (BẢO VỆ)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm shadow-indigo-100">
            <Lock className="w-6 h-6" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">Trang web được bảo vệ</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Hệ thống Đối Khớp Excel đang được khóa. Vui lòng cung cấp mã khóa riêng tư để được cấp quyền truy cập nội dung.
          </p>

          <form onSubmit={handleVerifyPassword} className="mt-6 text-left">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Mã truy cập riêng tư
            </label>
            <input
              type="password"
              placeholder="Nhập mã khóa tại đây..."
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-900 rounded-xl outline-none transition-all text-sm placeholder-slate-400 font-mono shadow-inner"
            />
            
            {lockError && (
              <p className="mt-2.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
                ⚠️ {lockError}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Xác thực & Vào ứng dụng
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH (Sau khi đã nhập đúng mã khóa)
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased pb-12 transition-all">
      {/* Top Professional Navigation Shell */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-200">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Trợ Lý Đối Khớp & Cập Nhật Giá Excel
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">v1.2</span>
              </h1>
              <p className="text-xs text-slate-500 leading-normal">
                Chuẩn hóa đuôi số thập phân, tự động dò tìm khớp SKU, cập nhật lại giá hàng loạt chính xác 100%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleLoadSampleData}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200/50"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              Sử dụng dữ liệu mẫu
            </button>
            {(sourceFile || refFile) && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                Gỡ File
              </button>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('site_access_granted');
                setIsAuthorized(false);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-dashed border-slate-200 transition-all cursor-pointer"
              title="Đăng xuất / Khóa lại trang"
            >
              Khóa lại
            </button>
          </div>
        </div>
      </header>

      {/* Main Structural Wrapper Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Twin File Landing Zone Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FileUploadZone
              id="source-orig"
              label="Tệp Gốc (Cần Tìm Sửa Giá)"
              placeholder="Kéo và thả file cần sửa vào đây"
              description="Hỗ trợ file Excel (.xlsx, .xls) hoặc CSV. Chứa SKU tại Cột F, giá gốc cột G, giá bán cột H."
              file={sourceFile}
              onFileLoaded={handleSourceFileLoaded}
              onFileCleared={() => {
                setSourceFile(null);
                setResult(null);
              }}
              iconName="master"
              highlightColor="indigo"
            />

            <FileUploadZone
              id="ref-pricing"
              label="Tệp Giá Mới (Tệp Đối Chiếu)"
              placeholder="Kéo và thả file giá mới vào đây"
              description="Chứa bảng đối chiếu mã SKU tương ứng với mức giá mới cần cập nhật."
              file={refFile}
              onFileLoaded={handleRefFileLoaded}
              onFileCleared={() => {
                setRefFile(null);
                setResult(null);
              }}
              iconName="reference"
              highlightColor="emerald"
            />
          </div>

          {/* Advanced Mapping Rules Drawer */}
          <MappingSettings
            sourceFile={sourceFile}
            refFile={refFile}
            config={columnConfig}
            onChange={setColumnConfig}
          />

          {/* Processing Action Trigger Panel */}
          {sourceFile && refFile && !result && (
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-3 items-start select-none">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800">Quy trình chuẩn hóa tự động</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Hệ thống sẽ làm sạch định dạng tiền tệ (xóa đuôi .00 ở cột G, H) và lấy giá mới khớp theo SKU dán đè cột H. Dòng và cột khác được giữ nguyên 100%.
                  </p>
                </div>
              </div>

              <button
                onClick={runMatchingAlgorithm}
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang đối chiếu...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Tiến Hành Xử Lý & Đối Chiếu
                  </>
                )}
              </button>
            </div>
          )}

          {/* Interactive Statistics & Copiable Report Panel */}
          {result && (
            <StatsDashboard 
              result={result} 
              onReset={handleClearAll} 
            />
          )}

          {/* Download Buttons Area If Process is Successful */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
              {/* File 1: Sửa */}
              <div className="flex flex-col gap-2 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-800 block">1. Tệp Kết Quả Hoàn Thiện</span>
                <p className="text-[11px] text-slate-400">
                  Tệp gốc đã được xóa hoàn toàn đuôi .00 ở cột G, H và cập nhật giá mới thành công tại Cột H cho các mã khớp SKU.
                </p>
                <button
                  onClick={downloadResultFile}
                  className="mt-3 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải File_Ket_Qua.xlsx
                </button>
              </div>

              {/* File 2: Đối Chiếu */}
              <div className="flex flex-col gap-2 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-800 block">2. Tệp Phân Tích Đối Chiếu Sâu</span>
                <p className="text-[11px] text-slate-400">
                  Tự động phân tách thành 2 Sheet riêng biệt chứa danh sách các SKU: [Đã Tìm Thấy SKU] và [Chưa Tìm Thấy SKU].
                </p>
                <button
                  onClick={downloadComparisonFile}
                  className="mt-3 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải File_Doi_Chieu_Ma.xlsx
                </button>
              </div>
            </div>
          )}

          {/* Preview Grid Sheets */}
          {result && (
            <MatchTable result={result} />
          )}

          {/* Real-time Operation Logs Console Section */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm shadow-slate-100">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Nhật Ký Thực Thi (Console)</span>
            </div>
            
            {logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Chờ tệp tải lên để bắt đầu xuất nhật ký xử lý dữ liệu...
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto font-mono text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-150">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2 items-start leading-relaxed">
                    <span className="text-slate-450 shrink-0">[{log.timestamp}]</span>
                    <span className={`
                      ${log.type === 'success' ? 'text-emerald-600 font-semibold' : ''}
                      ${log.type === 'error' ? 'text-rose-600 font-bold' : ''}
                      ${log.type === 'warn' ? 'text-amber-600 font-medium' : ''}
                      ${log.type === 'info' ? 'text-slate-600' : ''}
                    `}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
