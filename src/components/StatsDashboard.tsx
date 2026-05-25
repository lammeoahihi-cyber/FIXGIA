/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileSpreadsheet, CheckCircle2, AlertCircle, Copy, CopyCheck, Landmark, RotateCcw } from 'lucide-react';
import { ProcessingResult } from '../types';

interface StatsDashboardProps {
  result: ProcessingResult | null;
  onReset: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ result, onReset }) => {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const { totalScannedRows, matchingCount, notMatchingCount } = result;

  // The precise Vietnamese report text as literally requested
  const vnReportText = `--- BÁO CÁO XỬ LÝ FILE ---
- Tổng số dòng dữ liệu đã quét: ${totalScannedRows} dòng
- Số mã SKU đã được tìm thấy và cập nhật giá thành công ở Cột H: ${matchingCount} mã
- Số mã SKU không tìm thấy (giữ nguyên giá cũ): ${notMatchingCount} mã
- Đã hoàn thành việc xóa đuôi .00 ở cột G và H.`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(vnReportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Không thể sao chép văn bản: ', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Visual Bento counters cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scanned Lines */}
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm shadow-slate-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Số Dòng Đã Quét</span>
            <span className="text-xl font-bold text-slate-800 font-sans tracking-tight">{totalScannedRows}</span>
          </div>
        </div>

        {/* Updated values count */}
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm shadow-slate-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Khớp SKU (Cột H)</span>
            <span className="text-xl font-bold text-emerald-600 font-sans tracking-tight">+{matchingCount}</span>
          </div>
        </div>

        {/* Unchanged / Not matching */}
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm shadow-slate-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Giữ Nguyên Giá Cũ</span>
            <span className="text-xl font-bold text-slate-700 font-sans tracking-tight">{notMatchingCount}</span>
          </div>
        </div>

        {/* Normalization status */}
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm shadow-slate-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Chuẩn Hóa Đuôi .00</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
              ĐÃ XÓA SẠCH
            </span>
          </div>
        </div>
      </div>

      {/* Copyable precise text report block */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-md text-slate-100 relative">
        <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Báo Cáo Trực Quan (VnText)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              title="Sao chép báo cáo vào bộ nhớ tạm"
            >
              {copied ? (
                <>
                  <CopyCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              title="Lập lại từ đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gỡ File</span>
            </button>
          </div>
        </div>

        <pre className="font-mono text-sm leading-relaxed text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-850 overflow-x-auto whitespace-pre-wrap">
          {vnReportText}
        </pre>
      </div>
    </div>
  );
};
