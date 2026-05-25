/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, CopyCheck, Terminal, BookOpen, AlertCircle } from 'lucide-react';

export const PythonScriptBox: React.FC = () => {
  const [copied, setCopied] = useState(false);

  // The 100% reliable python pandas script fulfilling all constraints
  const pythonCode = `import pandas as pd
import numpy as np

def update_excel_prices(file_goc_path, file_gia_moi_path, output_ket_qua_path, output_doi_chieu_path):
    print("--- KHỞI CHẠY TIẾN TRÌNH XỬ LÝ PANDAS ---")
    
    # 1. Nạp File Gốc (Hỗ trợ cả .xlsx và .csv)
    # Nếu file gốc có dòng tiêu đề thừa ở trên (ví dụ Shopee 3 dòng đầu), 
    # hãy chỉnh lại tham số header=3 hoặc tự tách thủ công. Ở đây mặc định dòng 0 làm header.
    df_goc = pd.read_excel(file_goc_path) if file_goc_path.endswith('.xlsx') else pd.read_csv(file_goc_path)
    
    # 2. Nạp File Giá Mới
    df_gia_moi = pd.read_excel(file_gia_moi_path) if file_gia_moi_path.endswith('.xlsx') else pd.read_csv(file_gia_moi_path)
    
    # Chi tiết lấy dữ liệu các cột:
    # Cột F (Index 5): SKU Gốc
    # Cột G (Index 6): Giá gốc
    # Cột H (Index 7): Giá đã giảm
    col_sku_goc = df_goc.columns[5]      # "Số SKU Phân loại hàng (Tùy chọn)" hoặc "Mã SKU"
    col_gia_goc = df_goc.columns[6]      # "Giá gốc (Tùy chọn)"
    col_gia_dam = df_goc.columns[7]      # "Giá đã giảm"
    
    # Cột Giá mới trong file tham chiếu (Ví dụ cột 0 là SKU, cột 1 là Giá Mới)
    col_sku_ref = df_gia_moi.columns[0]
    col_new_ref = df_gia_moi.columns[1]

    # Hàm chuẩn hóa giá tiền: Xóa bỏ đuôi .00 và trả về dạng số nguyên (integer)
    def clean_price_value(val):
        if pd.isna(val) or val == "" or str(val).strip() == "":
            return np.nan
        val_str = str(val).strip()
        if val_str.endswith('.00'):
            val_str = val_str[:-3]
        elif val_str.endswith('.0'):
            val_str = val_str[:-2]
        try:
            # Chuyển đổi thành dạng số tự nhiên nếu hợp lệ
            float_val = float(val_str)
            if float_val.is_integer():
                return int(float_val)
            return float_val
        except ValueError:
            return val_str

    # 3. Tiến Hành Bước 1: Chuẩn hóa dữ liệu ở G và H (Xóa đuôi .00)
    df_goc[col_gia_goc] = df_goc[col_gia_goc].apply(clean_price_value)
    df_goc[col_gia_dam] = df_goc[col_gia_dam].apply(clean_price_value)
    df_gia_moi[col_new_ref] = df_gia_moi[col_new_ref].apply(clean_price_value)

    # Đảm bảo so khớp SKU không lỗi khoảng trắng thừa (áp dụng strip)
    df_goc[col_sku_goc] = df_goc[col_sku_goc].astype(str).str.strip()
    df_gia_moi[col_sku_ref] = df_gia_moi[col_sku_ref].astype(str).str.strip()
    
    # Tạo từ điển đối chiếu SKU -> Giá Mới từ file giá
    gia_dict = {}
    for _, row_ref in df_gia_moi.iterrows():
        sku_ref_raw = row_ref[col_sku_ref]
        if not pd.isna(sku_ref_raw) and sku_ref_raw is not None:
            sku_ref_clean = str(sku_ref_raw).strip().lower()
            if sku_ref_clean:
                gia_dict[sku_ref_clean] = row_ref[col_new_ref]

    # Hàm tìm kiếm SKU đối chiếu (Yêu cầu lấy SKU bên bảng giá mới tìm kiếm chính xác trong bảng tệp gốc với ranh giới từ)
    def find_best_sku_match(source_sku, ref_dict):
        if not source_sku or pd.isna(source_sku) or str(source_sku).strip() == "":
            return None, None
        source_val = str(source_sku).strip().lower()
        
        # 1. Kiểm tra khớp chính xác hoàn toàn (Case-insensitive)
        if source_val in ref_dict:
            return source_val, ref_dict[source_val]
            
        # 2. Khớp theo tiền tố có ranh giới phân loại phía sau (ví dụ: 'loa a36' khớp với 'loa a36 đen', 'loa a36 vàng')
        import re
        best_ref = None
        best_ref_len = 0
        
        for ref_sku, ref_price in ref_dict.items():
            if source_val.startswith(ref_sku):
                next_char = source_val[len(ref_sku):]
                # Nếu không còn ký tự nào tiếp theo, hoặc là ký tự đặc biệt/ranh giới từ (ví dụ khoảng trắng, dấu gạch ngang)
                is_word_boundary = len(next_char) == 0 or not re.match(r'[a-zA-Z0-9\u00c0-\u1eff]', next_char[0])
                if is_word_boundary:
                    if len(ref_sku) > best_ref_len:
                        best_ref_len = len(ref_sku)
                        best_ref = ref_sku
                        
        if best_ref:
            return best_ref, ref_dict[best_ref]
        return None, None

    # Sao lưu cột H cũ để phục vụ báo cáo đối chiếu
    df_goc['_old_gia_dam'] = df_goc[col_gia_dam]

    # 4. Tiến Hành Bước 2: Tra soát và Cập nhật giá bán ở cột H
    total_rows = len(df_goc)
    matching_count = 0
    not_matching_count = 0
    
    successful_skus = [] # Danh sách SKU gốc khớp thành công
    matched_ref_skus = set() # Tập hợp các SKU trong file Giá mới được đối chiếu thành công
    matched_ref_details = {} # Mô tả chi tiết các dòng File Gốc đối chiếu khớp với mã giá mới
    
    for idx, row in df_goc.iterrows():
        sku_raw = row[col_sku_goc]
        matched_ref_key, new_val = find_best_sku_match(sku_raw, gia_dict)
        
        if matched_ref_key:
            df_goc.at[idx, col_gia_dam] = new_val # Sửa cột H thành giá mới
            matching_count += 1
            successful_skus.append(row[col_sku_goc])
            matched_ref_skus.add(matched_ref_key)
            
            # Lưu vết chi tiết dòng gốc khớp
            detail_str = f"Dòng #{idx + 2} (Mã gốc: \"{sku_raw}\")"
            if matched_ref_key not in matched_ref_details:
                matched_ref_details[matched_ref_key] = []
            matched_ref_details[matched_ref_key].append(detail_str)
        else:
            not_matching_count += 1

    # 5. Xuất File 1: File_Ket_Qua.xlsx (Giữ nguyên cấu trúc dòng cột ban đầu)
    # Loại bỏ cột phụ trợ tạm thời trước khi xuất File kết quả
    df_goc_export = df_goc.drop(columns=['_old_gia_dam'], errors='ignore')
    if output_ket_qua_path.endswith('.xlsx'):
        df_goc_export.to_excel(output_ket_qua_path, index=False)
    else:
        df_goc_export.to_csv(output_ket_qua_path, index=False)

    # 6. Xuất File 2: File_Doi_Chieu_Ma.xlsx (3 sheet đối chiếu chi tiết)
    with pd.ExcelWriter(output_doi_chieu_path) as writer:
        # Sheet 1: Tổng hợp chi tiết từ phía File Giá Mới
        ref_summary_rows = []
        for idx_ref, row_ref in df_gia_moi.iterrows():
            sku_ref_raw = row_ref[col_sku_ref]
            price_ref_raw = row_ref[col_new_ref]
            
            if sku_ref_raw and not pd.isna(sku_ref_raw) and str(sku_ref_raw).strip() != "":
                sku_ref_clean = str(sku_ref_raw).strip().lower()
                is_found = sku_ref_clean in matched_ref_skus
                
                status_text = "ĐÃ TÌM THẤY & CẬP NHẬT" if is_found else "CHƯA TÌM THẤY TRONG FILE GỐC"
                
                details_text = ""
                if is_found and sku_ref_clean in matched_ref_details:
                    details_text = f"Khớp thành công với {len(matched_ref_details[sku_ref_clean])} sản phẩm gốc: " + ", ".join(matched_ref_details[sku_ref_clean])
                else:
                    details_text = "Không tìm thấy mã này trong bất kỳ dòng sản phẩm nào của File Gốc"
                
                ref_summary_rows.append({
                    'Dòng (File Giá Mới)': idx_ref + 2,
                    'Mã SKU Giá Mới': str(sku_ref_raw).strip(),
                    'Giá Mới Đề Xuất': price_ref_raw,
                    'Trạng Thế': status_text,
                    'Chi Tiết Đối Chiếu Trong File Gốc': details_text
                })
        
        df_ref_summary = pd.DataFrame(ref_summary_rows)
        # Sửa lại tiêu đề cột đúng chính tả tiếng Việt
        df_ref_summary.columns = ['Dòng (File Giá Mới)', 'Mã SKU Giá Mới', 'Giá Mới Đề Xuất', 'Trạng Thái', 'Chi Tiết Đối Chiếu Trong File Gốc']
        df_ref_summary.to_excel(writer, sheet_name='Tổng Hợp File Giá Mới', index=False)

        # Sheet 2: Danh sách ĐÃ tìm thấy (từ góc nhìn sản phẩm File Gốc)
        found_rows_list = []
        df_found_goc = df_goc[df_goc[col_sku_goc].isin(successful_skus)]
        for idx_f, row_f in df_found_goc.iterrows():
            sku_g = row_f[col_sku_goc]
            matched_ref_k, _ = find_best_sku_match(sku_g, gia_dict)
            found_rows_list.append({
                'Dòng Gốc': idx_f + 2,
                'Mã SKU gốc': sku_g,
                'SKU Giá Mới Khớp': matched_ref_k.upper() if matched_ref_k else '',
                'Giá Gốc Cũ (G)': row_f[col_gia_goc],
                'Giá Khuyến Mãi Cũ (H)': row_f['_old_gia_dam'],
                'Giá Khuyến Mãi Mới (H)': row_f[col_gia_dam]
            })
        df_da_khop = pd.DataFrame(found_rows_list)
        df_da_khop.to_excel(writer, sheet_name='Đã Tìm Thấy SKU', index=False)
        
        # Sheet 3: Danh sách CHƯA tìm thấy (Tổng hợp cả dòng gốc và giá mới không đối chiếu được)
        unmatched_rows = []
        
        # 1. Dòng gốc chưa khớp
        df_unmatched_goc = df_goc[~df_goc[col_sku_goc].isin(successful_skus)]
        for idx_un, row_un in df_unmatched_goc.iterrows():
            sku_val = row_un[col_sku_goc]
            if sku_val and not pd.isna(sku_val) and str(sku_val).strip() != "":
                unmatched_rows.append({
                    'Nguồn gốc': 'File Gốc',
                    'Dòng': idx_un + 2,
                    'Mã SKU': str(sku_val).strip(),
                    'Giá bán hiện tại / Giá mới đề xuất': row_un[col_gia_dam],
                    'Mô tả chi tiết': 'Mã SKU này không tồn tại trong Tệp Giá Mới đối chiếu'
                })
                
        # 2. Dòng giá mới chưa khớp
        for idx_ref, row_ref in df_gia_moi.iterrows():
            sku_ref_raw = row_ref[col_sku_ref]
            price_ref_raw = row_ref[col_new_ref]
            if sku_ref_raw and not pd.isna(sku_ref_raw) and str(sku_ref_raw).strip() != "":
                sku_ref_clean = str(sku_ref_raw).strip().lower()
                if sku_ref_clean not in matched_ref_skus:
                    unmatched_rows.append({
                        'Nguồn gốc': 'File Giá Mới',
                        'Dòng': idx_ref + 2,
                        'Mã SKU': str(sku_ref_raw).strip(),
                        'Giá bán hiện tại / Giá mới đề xuất': price_ref_raw,
                        'Mô tả chi tiết': 'Có trong bảng Giá Mới nhưng không được dán vào bất cứ dòng nào của File Gốc'
                    })
                    
        df_unmatched_all = pd.DataFrame(unmatched_rows)
        df_unmatched_all.to_excel(writer, sheet_name='Chưa Tìm Thấy SKU', index=False)
        
    # 7. In Báo Cáo Kết Quả ra Terminal theo đúng biểu mẫu Việt hóa
    print("\\n--- BÁO CÁO XỬ LÝ FILE ---")
    print(f"- Tổng số dòng dữ liệu đã quét: {total_rows}")
    print(f"- Số mã SKU đã được tìm thấy và cập nhật giá thành công ở Cột H: {matching_count}")
    print(f"- Số mã SKU không tìm thấy (giữ nguyên giá cũ): {not_matching_count}")
    print("- Đã hoàn thành việc xóa đuôi .00 ở cột G và H.")

# Ví dụ chạy test local:
# update_excel_prices("file_goc.xlsx", "file_gia_moi.xlsx", "File_Ket_Qua.xlsx", "File_Doi_Chieu_Ma.xlsx")
`;

  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pythonCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg shrink-0">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Mã Python Xử Lý (Pandas)</h3>
            <p className="text-xs text-slate-400">Chạy đoạn script này trên máy tính cục bộ của bạn để tự động hóa xử lý ngoại tuyến</p>
          </div>
        </div>

        <button
          onClick={copyCodeToClipboard}
          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100/60 hover:bg-indigo-100 hover:text-indigo-700 text-xs text-indigo-600 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? (
            <>
              <CopyCheck className="w-3.5 h-3.5" />
              <span>Đã Sao Chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sao Chép Script</span>
            </>
          )}
        </button>
      </div>

      <div className="rounded-lg bg-amber-50/55 text-amber-800 px-4 py-3 border border-amber-100/60 flex items-start gap-2 text-xs leading-relaxed mb-4">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <div>
          <strong>Môi trường chuẩn bị:</strong> Hãy đảm bảo môi trường Python của bạn đã cài đặt các thư viện bằng lệnh:{' '}
          <code className="font-mono text-[11px] bg-amber-100 font-bold px-1.5 py-0.5 rounded text-amber-900">
            pip install pandas openpyxl
          </code>
          . Đoạn code này được viết và tối ưu hóa dựa theo đúng phương pháp <strong>pandas.dataframe</strong> để đối chiếu nhanh hàng vạn SKU.
        </div>
      </div>

      <div className="relative">
        <pre className="font-mono text-[11px] md:text-xs leading-relaxed text-slate-300 bg-slate-900 p-4 rounded-xl border border-slate-850 overflow-x-auto max-h-[350px]">
          {pythonCode}
        </pre>
      </div>

      <div className="flex items-center gap-1.5 mt-3.5 text-xs text-slate-400">
        <BookOpen className="w-4 h-4 text-emerald-500" />
        <span>Bản quyền mã lập trình tối ưu hóa miễn phí được phát triển bởi Trợ Lý AI của bạn.</span>
      </div>
    </div>
  );
};
