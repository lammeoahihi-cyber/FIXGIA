/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ColumnMappingConfig, FileData } from '../types';
import { getColumnLetter } from '../utils/excelProcessor';
import { Settings2, ArrowRightLeft, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface MappingSettingsProps {
  sourceFile: FileData | null;
  refFile: FileData | null;
  config: ColumnMappingConfig;
  onChange: (updated: ColumnMappingConfig) => void;
}

export const MappingSettings: React.FC<MappingSettingsProps> = ({
  sourceFile,
  refFile,
  config,
  onChange
}) => {
  if (!sourceFile && !refFile) return null;

  const handleSourceSkuChange = (val: number) => {
    onChange({ ...config, sourceSkuCol: val, hasCustomMapping: true });
  };

  const handleSourcePriceGChange = (val: number) => {
    onChange({ ...config, sourcePriceGCol: val, hasCustomMapping: true });
  };

  const handleSourcePriceHChange = (val: number) => {
    onChange({ ...config, sourcePriceHCol: val, hasCustomMapping: true });
  };

  const handleRefSkuChange = (val: number) => {
    onChange({ ...config, refSkuCol: val, hasCustomMapping: true });
  };

  const handleRefPriceChange = (val: number) => {
    onChange({ ...config, refPriceCol: val, hasCustomMapping: true });
  };

  const renderColOption = (file: FileData, colIdx: number) => {
    const letter = getColumnLetter(colIdx);
    const headerText = file.headers[colIdx];
    const previewText = headerText ? `"${headerText}"` : 'Trống';
    return `Cột ${letter} - ${previewText}`;
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm shadow-slate-100 mb-8">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <div className="bg-sky-50 text-sky-600 p-1.5 rounded-lg">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Cấu Hình Tra Cứu & Đối Chiếu Cột</h3>
          <p className="text-xs text-slate-400">Điều chỉnh liên kết cột nếu tệp không thuộc cấu trúc chuẩn mặc định (Cột F, G, H)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source File Column Map */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
            Tệp Gốc (Cần cập nhật giá)
          </div>

          {sourceFile ? (
            <div className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
              {/* SKU SKU */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">
                  Cột Mã SKU định danh (Cột F chuẩn)
                </label>
                <select
                  value={config.sourceSkuCol}
                  onChange={(e) => handleSourceSkuChange(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
                >
                  {sourceFile.columnsList.map((_, idx) => (
                    <option key={`src-sku-${idx}`} value={idx}>
                      {renderColOption(sourceFile, idx)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price G */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">
                  Cột Giá gốc (Cột G chuẩn - Sẽ xóa đuôi .00)
                </label>
                <select
                  value={config.sourcePriceGCol}
                  onChange={(e) => handleSourcePriceGChange(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
                >
                  {sourceFile.columnsList.map((_, idx) => (
                    <option key={`src-g-${idx}`} value={idx}>
                      {renderColOption(sourceFile, idx)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price H */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">
                  Cột Giá đã giảm (Cột H chuẩn - Cần cập nhật)
                </label>
                <select
                  value={config.sourcePriceHCol}
                  onChange={(e) => handleSourcePriceHChange(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
                >
                  {sourceFile.columnsList.map((_, idx) => (
                    <option key={`src-h-${idx}`} value={idx}>
                      {renderColOption(sourceFile, idx)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[120px] rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-4 text-center text-slate-400">
              <FileSpreadsheet className="h-5 w-5 mb-2 opacity-40 shrink-0" />
              <span className="text-xs">Hãy tải tệp gốc để thiết lập</span>
            </div>
          )}
        </div>

        {/* Reference File Column Map */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Tệp Giá Mới đối chiếu
          </div>

          {refFile ? (
            <div className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
              {/* Ref SKU */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">
                  Cột Mã SKU đối chiếu
                </label>
                <select
                  value={config.refSkuCol}
                  onChange={(e) => handleRefSkuChange(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 outline-none focus:border-emerald-500 shadow-sm transition-all cursor-pointer"
                >
                  {refFile.columnsList.map((_, idx) => (
                    <option key={`ref-sku-${idx}`} value={idx}>
                      {renderColOption(refFile, idx)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ref Price */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">
                  Cột Giá bán mới
                </label>
                <select
                  value={config.refPriceCol}
                  onChange={(e) => handleRefPriceChange(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 outline-none focus:border-emerald-500 shadow-sm transition-all cursor-pointer"
                >
                  {refFile.columnsList.map((_, idx) => (
                    <option key={`ref-price-${idx}`} value={idx}>
                      {renderColOption(refFile, idx)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3">
                <div className="rounded-lg bg-emerald-50/60 text-emerald-800 p-2.5 border border-emerald-100/60 flex items-start gap-2 text-[11px] leading-relaxed">
                  <ArrowRightLeft className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  <span>
                    Hệ thống sẽ lấy giá trị khớp SKU tại đây đè lên <strong>Cột {getColumnLetter(config.sourcePriceHCol)} (Giá đã giảm)</strong> của tệp gốc.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[120px] rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-4 text-center text-slate-400">
              <FileSpreadsheet className="h-5 w-5 mb-2 opacity-40 shrink-0" />
              <span className="text-xs">Hãy tải tệp đối chiếu giá để thiết lập</span>
            </div>
          )}
        </div>
      </div>

      {sourceFile && refFile && (
        <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-sky-500" />
          <span>
            Đã phát hiện tự động. Nếu đúng, ấn nút <strong>"Tiến Hành Xử Lý & Đối Chiếu"</strong> bên dưới để bắt đầu.
          </span>
        </div>
      )}
    </div>
  );
};
