/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, ArrowRight, Table, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { ProcessingResult, ProcessedItem } from '../types';

interface MatchTableProps {
  result: ProcessingResult | null;
}

export const MatchTable: React.FC<MatchTableProps> = ({ result }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FOUND' | 'NOT_FOUND'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  if (!result) return null;

  const { processedItems } = result;

  // Filter items
  const filteredItems = processedItems.filter((item) => {
    const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'FOUND' && item.status === 'FOUND') ||
      (categoryFilter === 'NOT_FOUND' && item.status === 'NOT_FOUND');
    return matchesSearch && matchesCategory;
  });

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTabChange = (tab: 'ALL' | 'FOUND' | 'NOT_FOUND') => {
    setCategoryFilter(tab);
    setCurrentPage(1);
  };

  const formatPrice = (val: any) => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'number') {
      return val.toLocaleString('vi-VN');
    }
    return String(val);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm shadow-slate-100 flex flex-col gap-4">
      {/* Table Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg shrink-0">
            <Table className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Bảng Xem Trước Đối Chiếu Chi Tiết</h3>
            <p className="text-xs text-slate-400">Xem trước kết quả đã so khớp trực tiếp trong trình duyệt</p>
          </div>
        </div>

        {/* Filter Selection Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-center">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({processedItems.length})
          </button>
          <button
            onClick={() => handleTabChange('FOUND')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              categoryFilter === 'FOUND'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            Đã khớp ({processedItems.filter((i) => i.status === 'FOUND').length})
          </button>
          <button
            onClick={() => handleTabChange('NOT_FOUND')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              categoryFilter === 'NOT_FOUND'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-amber-600'
            }`}
          >
            Chưa khớp ({processedItems.filter((i) => i.status === 'NOT_FOUND').length})
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-lg px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Tìm kiếm theo Mã SKU..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-transparent border-none outline-none text-xs text-slate-700 w-full placeholder:text-slate-400"
        />
      </div>

      {/* Interactive Grid Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 font-mono w-[80px]">Dòng</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-500">Mã SKU</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-500">Giá Gốc (Cột G)</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-500">Giá Khuyến Mãi Cũ (Cột H)</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-500">Trạng Thái</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-550 bg-indigo-50/40 text-right">Giá Khuyến Mãi Mới (Cột H mới)</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  Không tìm thấy kết quả nào trùng khớp điều kiện lọc.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 text-xs hover:bg-slate-50/40 transition-colors ${
                    item.status === 'FOUND' ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-mono text-slate-400">#{item.rowNumber}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-700 font-mono select-all">
                    <div>{item.sku || <span className="text-slate-350 italic font-sans font-normal">Trống</span>}</div>
                    {item.status === 'FOUND' && item.matchedSku && item.matchedSku !== item.sku.trim().toLowerCase() && (
                      <div className="text-[10px] text-indigo-500 font-sans font-medium mt-0.5">
                        Khớp từ: <span className="font-mono bg-indigo-50 px-1 py-0.2 rounded">{item.matchedSku.toUpperCase()}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {formatPrice(item.originalPriceG)}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-500 line-through">
                    {formatPrice(item.originalPriceH)}
                  </td>
                  <td className="py-2.5 px-4">
                    {item.status === 'FOUND' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[10px] border border-emerald-100">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Đã Cập Nhật
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full text-[10px] border border-amber-100">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        Giữ Nguyên
                      </span>
                    )}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-mono font-bold text-slate-800 bg-indigo-50/20 ${
                    item.status === 'FOUND' ? 'text-emerald-600 bg-emerald-50/30 font-semibold border-l border-emerald-50' : 'text-slate-600'
                  }`}>
                    {formatPrice(item.newPriceH)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="text-slate-400">
            Hiển thị <strong className="font-semibold text-slate-700">{startIndex + 1}</strong> đến{' '}
            <strong className="font-semibold text-slate-700">
              {Math.min(startIndex + itemsPerPage, filteredItems.length)}
            </strong> trong tổng số{' '}
            <strong className="font-semibold text-slate-700">{filteredItems.length}</strong> dòng
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trang Trước
            </button>
            <span className="text-slate-500 font-medium px-2">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trang Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
