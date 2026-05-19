const db = require('../config/db');
const ExcelJS = require('exceljs');

module.exports = {
    index: async (req, res) => {
        try {
            const [namHocList] = await db.query("SELECT * FROM nam_hoc ORDER BY id DESC");
            res.render('print/index', { namHocList });
        } catch (error) {
            res.status(500).send("Lỗi tải trang: " + error.message);
        }
    },

    getLopsByNamHoc: async (req, res) => {
        try {
            const { nam_hoc_id } = req.params;
            const [lops] = await db.query(`
                SELECT DISTINCT l.id, l.ten_lop 
                FROM lop_hoc l
                JOIN phan_cong_giang_vien pcgv ON l.id = pcgv.lop_hoc_id
                WHERE pcgv.nam_hoc_id = ?
                ORDER BY l.ten_lop ASC
            `, [nam_hoc_id]);
            res.json(lops);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    printByLop: async (req, res) => {
    try {
        const { nam_hoc_id, lop_id } = req.query;

        // 1. Lấy dữ liệu Header
        const [[info]] = await db.query(`
            SELECT l.ten_lop, l.si_so, 
            (l.hoc_phi * l.ty_le_chi_vat_tu / 100) as tien_khoan_tinh_toan, 
            nh.nam_hoc, nh.hoc_ky,
            (
                SELECT GROUP_CONCAT(DISTINCT SUBSTRING_INDEX(mh.ten_mon_hoc, ':', 1) SEPARATOR ', ')
                FROM phan_cong_giang_vien pc
                JOIN mon_hoc mh ON pc.mon_hoc_id = mh.id
                WHERE pc.lop_hoc_id = l.id AND pc.nam_hoc_id = nh.id
            ) as ds_mon_hoc
            FROM lop_hoc l, nam_hoc nh 
            WHERE l.id = ? AND nh.id = ?
        `, [lop_id, nam_hoc_id]);

        if (!info) return res.send("Không tìm thấy dữ liệu");

        // 2. Lấy dữ liệu Vật tư
        const [rows] = await db.query(`
            SELECT vt.ten_hang, vt.don_vi_tinh, pcvt.so_luong, vt.don_gia, 
                   (pcvt.so_luong * vt.don_gia) as thanh_tien, 
                   vt.thong_so_ky_thuat, gv.ho_ten, vt.id as vat_tu_id, mh.ten_mon_hoc
            FROM phan_cong_vat_tu pcvt
            JOIN phan_cong_giang_vien pcgv ON pcvt.phan_cong_gv_id = pcgv.id
            JOIN vat_tu vt ON pcvt.vat_tu_id = vt.id
            JOIN giang_vien gv ON pcgv.giang_vien_id = gv.id
            JOIN mon_hoc mh ON pcgv.mon_hoc_id = mh.id
            WHERE pcgv.nam_hoc_id = ? AND pcgv.lop_hoc_id = ?
        `, [nam_hoc_id, lop_id]);

        const groupedData = rows.reduce((acc, row) => {
            const key = row.vat_tu_id;
            if (!acc[key]) {
                acc[key] = { ...row, tong_sl: 0, tong_tt: 0, gv_details: [], modules: new Set() };
            }
            const formatSL = (n) => Number(n) % 1 === 0 ? Number(n) : Number(n);
            acc[key].gv_details.push(`${row.ho_ten} (${formatSL(row.so_luong)})`);
            acc[key].modules.add(row.ten_mon_hoc.split(':')[0]);
            acc[key].tong_sl += Number(row.so_luong);
            acc[key].tong_tt += Number(row.thanh_tien);
            return acc;
        }, {});

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Du Tru');
        
        // SET FONT CHUNG CHO TOÀN SHEET
        sheet.font = { name: 'Times New Roman', size: 13 };
        sheet.properties.defaultRowHeight = 28;

        // --- HEADER QUỐC HIỆU ---
        sheet.mergeCells('A1:C1');
        sheet.getCell('A1').value = 'TRƯỜNG CAO ĐẲNG NGHỀ CẦN THƠ';
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:C2');
        sheet.getCell('A2').value = 'KHOA CƠ KHÍ';
        sheet.getCell('A2').font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        sheet.mergeCells('G1:I1');
        sheet.getCell('G1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
        sheet.getCell('G1').font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell('G1').alignment = { horizontal: 'center' };

        sheet.mergeCells('G2:I2');
        sheet.getCell('G2').value = 'Độc lập - Tự do - Hạnh phúc';
        sheet.getCell('G2').font = { bold: true, italic: true, name: 'Times New Roman', size: 13 };
        sheet.getCell('G2').alignment = { horizontal: 'center' };

        sheet.mergeCells('G5:I5');
        sheet.getCell('G5').value = 'Cần Thơ, ngày.....tháng.....năm 202....';
        sheet.getCell('G5').font = { italic: true, name: 'Times New Roman', size: 13 };
        sheet.getCell('G5').alignment = { horizontal: 'center' };

        // --- TIÊU ĐỀ CHÍNH ---
        sheet.mergeCells('A6:I6');
        sheet.getCell('A6').value = 'BẢNG ĐỀ NGHỊ VÀ DỰ TRÙ CỦA GIÁO VIÊN';
        sheet.getCell('A6').font = { bold: true, size: 16, name: 'Times New Roman' };
        sheet.getCell('A6').alignment = { horizontal: 'center' };

        sheet.mergeCells('A7:I7');
        sheet.getCell('A7').value = `VẬT TƯ THỰC TẬP HỌC KỲ ${info.hoc_ky} NĂM HỌC ${info.nam_hoc}`;
        sheet.getCell('A7').font = { name: 'Times New Roman', size: 13 };
        sheet.getCell('A7').alignment = { horizontal: 'center' };

        // --- BẢNG CHI TIẾT LỚP ---
        sheet.getCell('A10').value = 'Chi tiết:';
        const subCols = ['B', 'C', 'D', 'E', 'F'];
        const subVals = ['TÊN LỚP', 'SỈ SỐ', 'TIỀN/SV', 'THÀNH TIỀN', 'MÔ ĐUN'];
        subVals.forEach((v, i) => {
            const cell = sheet.getCell(`${subCols[i]}11`);
            cell.value = v; 
            cell.font = { bold: true, name: 'Times New Roman', size: 13 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });
        sheet.mergeCells('F11:H11');

        const dRow = sheet.getRow(12);
        dRow.getCell(2).value = info.ten_lop;
        dRow.getCell(3).value = info.si_so;
        dRow.getCell(4).value = Number(info.tien_khoan_tinh_toan);
        dRow.getCell(5).value = info.si_so * info.tien_khoan_tinh_toan;
        dRow.getCell(6).value = info.ds_mon_hoc;
        ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
            const cell = sheet.getCell(`${col}12`);
            cell.font = { name: 'Times New Roman', size: 13 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            if (col === 'D' || col === 'E') cell.numFmt = '#,##0';
        });
        sheet.mergeCells('F12:H12');

        // --- BẢNG VẬT TƯ CHÍNH ---
        const hRow = sheet.getRow(15);
        hRow.values = ['STT', 'TÊN VẬT TƯ', 'ĐVT', 'SỐ LƯỢNG', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'QUY CÁCH', 'MODUL', 'GIẢNG VIÊN (SỐ LƯỢNG)'];
        hRow.eachCell(c => {
            c.font = { bold: true, name: 'Times New Roman', size: 13 }; 
            c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });

        let cur = 16;
        let total = 0;
        Object.values(groupedData).forEach((item, index) => {
            const row = sheet.getRow(cur);
            const tongSLFormatted = item.tong_sl % 1 === 0 ? item.tong_sl : item.tong_sl;
            row.values = [
                index + 1, item.ten_hang, item.don_vi_tinh, tongSLFormatted,
                Number(item.don_gia), item.tong_tt, item.thong_so_ky_thuat,
                Array.from(item.modules).join(', '), item.gv_details.join('; ')
            ];
            total += item.tong_tt;
            row.eachCell((c, i) => {
                c.font = { name: 'Times New Roman', size: 13 };
                c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
                c.alignment = { vertical: 'middle', wrapText: true };
                if (i === 1 || i === 4) c.alignment.horizontal = 'center';
                if (i === 5 || i === 6) {
                    c.numFmt = '#,##0';
                    c.alignment.horizontal = 'right';
                }
            });
            cur++;
        });

        // Tổng cộng
        sheet.mergeCells(`A${cur}:E${cur}`);
        sheet.getCell(`A${cur}`).value = 'TỔNG CỘNG';
        sheet.getCell(`A${cur}`).font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell(`A${cur}`).alignment = { horizontal: 'center' };
        sheet.getCell(`F${cur}`).value = total;
        sheet.getCell(`F${cur}`).font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell(`F${cur}`).numFmt = '#,##0';
        for(let i=1; i<=9; i++) sheet.getCell(cur, i).border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };

        // --- PHẦN KÝ TÊN & GHI CHÚ ---
        cur += 2;
        sheet.mergeCells(`A${cur}:I${cur}`);
        sheet.getCell(`A${cur}`).value = 'Viết bằng chữ: ...........................';
        sheet.getCell(`A${cur}`).font = { name: 'Times New Roman', size: 13 };
        
        cur++;
        sheet.mergeCells(`A${cur}:I${cur}`);
        sheet.getCell(`A${cur}`).value = 'Ghi chú: .................................';
        sheet.getCell(`A${cur}`).font = { name: 'Times New Roman', size: 13 };
        
        cur += 2;
        sheet.mergeCells(`B${cur}:C${cur}`);
        sheet.getCell(`B${cur}`).value = 'KHOA CƠ KHÍ';
        sheet.getCell(`B${cur}`).font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell(`B${cur}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`G${cur}:I${cur}`);
        sheet.getCell(`G${cur}`).value = 'GIÁO VIÊN LẬP';
        sheet.getCell(`G${cur}`).font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell(`G${cur}`).alignment = { horizontal: 'center' };

        cur += 4;
        sheet.mergeCells(`B${cur}:C${cur}`);
        sheet.getCell(`B${cur}`).value = 'Trần Thanh Điền';
        sheet.getCell(`B${cur}`).font = { bold: true, name: 'Times New Roman', size: 13 };
        sheet.getCell(`B${cur}`).alignment = { horizontal: 'center' };

        // CẬP NHẬT ĐỘ RỘNG CỘT
        sheet.columns = [
            { width: 5 }, { width: 28 }, { width: 8 }, { width: 10 }, 
            { width: 12 }, { width: 16 }, { width: 45 }, { width: 15 }, { width: 35 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=DuTru_${info.ten_lop}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi xuất file: " + error.message);
    }
},

printByHocKyCoTien: async (req, res) => {
    try {
        const { nam_hoc_id } = req.query;

        // 1. LẤY DỮ LIỆU
        const [[nhInfo]] = await db.query("SELECT * FROM nam_hoc WHERE id = ?", [nam_hoc_id]);
        const [lops] = await db.query(`
            SELECT l.*, 
            ((l.hoc_phi * l.ty_le_chi_vat_tu / 100) + l.tien_khoan_vat_tu) as tien_sv,
            (l.si_so * ((l.hoc_phi * l.ty_le_chi_vat_tu / 100) + l.tien_khoan_vat_tu)) as thanh_tien_lop,
            (
                SELECT GROUP_CONCAT(DISTINCT mh.ten_mon_hoc SEPARATOR '||')
                FROM phan_cong_giang_vien pc
                JOIN mon_hoc mh ON pc.mon_hoc_id = mh.id
                WHERE pc.lop_hoc_id = l.id AND pc.nam_hoc_id = ?
            ) as ds_mon_hoc_full
            FROM lop_hoc l WHERE l.nam_hoc_id = ?
        `, [nam_hoc_id, nam_hoc_id]);

        const [vatTuRows] = await db.query(`
            SELECT vt.id as vt_id, vt.ten_hang, vt.don_vi_tinh, vt.don_gia, vt.thong_so_ky_thuat, 
                   vt.is_dmktkt, pcvt.so_luong, (pcvt.so_luong * vt.don_gia) as thanh_tien,
                   gv.ho_ten, l.ten_lop, mh.ten_mon_hoc
            FROM phan_cong_vat_tu pcvt
            JOIN phan_cong_giang_vien pcgv ON pcvt.phan_cong_gv_id = pcgv.id
            JOIN vat_tu vt ON pcvt.vat_tu_id = vt.id
            JOIN giang_vien gv ON pcgv.giang_vien_id = gv.id
            JOIN lop_hoc l ON pcgv.lop_hoc_id = l.id
            JOIN mon_hoc mh ON pcgv.mon_hoc_id = mh.id
            WHERE pcgv.nam_hoc_id = ?
        `, [nam_hoc_id]);

        const groupedVatTu = vatTuRows.reduce((acc, row) => {
            if (!acc[row.vt_id]) {
                acc[row.vt_id] = { ...row, tong_sl: 0, tong_tt: 0, gv_list: [], lops: new Set(), modules: new Set() };
            }
            acc[row.vt_id].tong_sl += Number(row.so_luong);
            acc[row.vt_id].tong_tt += Number(row.thanh_tien);
            acc[row.vt_id].gv_list.push(`${row.ho_ten}(${Number(row.so_luong)})`);
            acc[row.vt_id].lops.add(row.ten_lop);
            acc[row.vt_id].modules.add(row.ten_mon_hoc.split(':')[0]);
            return acc;
        }, {});

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('TongHopHocKy');
        sheet.font = { name: 'Times New Roman', size: 13 };

        const setCenterHeader = (cellRange, val, isBold = false, size = 13) => {
            sheet.mergeCells(cellRange);
            const cell = sheet.getCell(cellRange.split(':')[0]);
            cell.value = val;
            cell.font = { name: 'Times New Roman', size, bold: isBold };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        };

        setCenterHeader('A3:D3', 'TRƯỜNG CAO ĐẲNG NGHỀ CẦN THƠ');
        setCenterHeader('A4:D4', 'KHOA CƠ KHÍ', true);
        setCenterHeader('E3:L3', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', true);
        setCenterHeader('E4:L4', 'Độc lập – Tự do – Hạnh phúc');
        
        sheet.mergeCells('H6:L6');
        const dateCell = sheet.getCell('H6');
        dateCell.value = 'Cần Thơ, ngày.....tháng.....năm 202...';
        dateCell.font = { italic: true, name: 'Times New Roman', size: 13 };
        dateCell.alignment = { horizontal: 'center' };

        setCenterHeader('A8:L8', 'BẢNG ĐỀ NGHỊ VÀ DỰ TRÙ CỦA GIÁO VIÊN', true, 16);
        setCenterHeader('A9:L9', `VẬT TƯ THỰC TẬP HỌC KỲ ${nhInfo.hoc_ky} NĂM HỌC ${nhInfo.nam_hoc}`, true);

        // --- BẢNG 1: CHI TIẾT LỚP ---
        let cur = 11;
        sheet.getCell(`B${cur}`).value = 'Chi tiết:'; 
        sheet.getCell(`B${cur}`).font = { italic: true, name: 'Times New Roman', size: 13 };
        cur++;

        const lopHeader = ['STT', 'TÊN LỚP', 'SỈ SỐ', 'TIỀN/1 SV', 'THÀNH TIỀN', 'MODUL'];
        const lopRow = sheet.getRow(cur);
        lopHeader.forEach((h, i) => {
            const cell = lopRow.getCell(i + 2);
            cell.value = h;
            cell.font = { bold: true, name: 'Times New Roman', size: 13 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });
        cur++;

        let tongTienBang1 = 0;
        lops.forEach((l, idx) => {
            const dsModuleDoc = l.ds_mon_hoc_full ? Array.from(new Set(l.ds_mon_hoc_full.split('||').map(m => m.split(':')[0].trim()))).join(', ') : '';
            const row = sheet.getRow(cur);
            row.values = [null, idx + 1, l.ten_lop, l.si_so, Number(l.tien_sv), Number(l.thanh_tien_lop), dsModuleDoc];
            
            row.eachCell((cell, colNum) => {
                if (colNum >= 2 && colNum <= 7) {
                    cell.font = { name: 'Times New Roman', size: 13 };
                    cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
                    cell.alignment = { vertical: 'middle' };
                    // CĂN GIỮA CỘT STT (Cột B - index 2)
                    if (colNum === 2) cell.alignment.horizontal = 'center';
                    if (colNum === 5 || colNum === 6) { cell.numFmt = '#,##0'; cell.alignment.horizontal = 'right'; }
                }
            });
            tongTienBang1 += Number(l.thanh_tien_lop);
            cur++;
        });

        sheet.mergeCells(`B${cur}:E${cur}`);
        const t1 = sheet.getCell(`B${cur}`);
        t1.value = 'Tổng số tiền VTTT:';
        t1.font = { bold: true, name: 'Times New Roman', size: 13 };
        
        const v1 = sheet.getCell(`F${cur}`);
        v1.value = tongTienBang1;
        v1.font = { bold: true, name: 'Times New Roman', size: 13 };
        v1.numFmt = '#,##0';
        for(let i=2; i<=7; i++) sheet.getRow(cur).getCell(i).border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        cur += 2;

        // --- BẢNG 2: TỔNG HỢP VẬT TƯ ---
        const mainHeader = ['STT', 'TÊN VẬT TƯ', 'ĐVT', 'SỐ LƯỢNG', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'QUY CÁCH', 'MODUL', 'GIẢNG VIÊN (SL)', 'LỚP', 'ĐMKTKT'];
        const mRow = sheet.getRow(cur);
        mainHeader.forEach((h, i) => {
            const cell = mRow.getCell(i + 2);
            cell.value = h;
            cell.font = { bold: true, name: 'Times New Roman', size: 13 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });
        cur++;

        let totalHocKy = 0;
        Object.values(groupedVatTu).forEach((v, idx) => {
            const row = sheet.getRow(cur);
            row.values = [null, idx + 1, v.ten_hang, v.don_vi_tinh, v.tong_sl, Number(v.don_gia), v.tong_tt, v.thong_so_ky_thuat, Array.from(v.modules).join(', '), v.gv_list.join('; '), Array.from(v.lops).join(', '), v.is_dmktkt ? 'Có' : 'Không'];
            
            row.eachCell((cell, colNum) => {
                if (colNum >= 2) {
                    cell.font = { name: 'Times New Roman', size: 13 };
                    cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                    // CĂN GIỮA CỘT STT (Cột B - index 2)
                    if (colNum === 2) cell.alignment.horizontal = 'center';
                    if (colNum === 6 || colNum === 7) { cell.numFmt = '#,##0'; cell.alignment.horizontal = 'right'; }
                }
            });
            totalHocKy += v.tong_tt;
            cur++;
        });

        sheet.mergeCells(`B${cur}:F${cur}`);
        const tc2 = sheet.getCell(`B${cur}`);
        tc2.value = 'TỔNG CỘNG';
        tc2.font = { bold: true, name: 'Times New Roman', size: 13 };
        tc2.alignment = { horizontal: 'center' };
        
        const vc2 = sheet.getCell(`G${cur}`);
        vc2.value = totalHocKy;
        vc2.font = { bold: true, name: 'Times New Roman', size: 13 };
        vc2.numFmt = '#,##0';
        for(let i=2; i<=12; i++) sheet.getRow(cur).getCell(i).border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        
        cur += 3;

        // --- 4. GHI CHÚ (ĐƯA CỘT 2 VỀ CỘT D SÁT NHAU) ---
        sheet.getCell(`B${cur}`).value = 'Ghi chú:';
        sheet.getCell(`B${cur}`).font = { bold: true, italic: true, name: 'Times New Roman', size: 13 };
        cur++;

        const moduleNotes = [];
        const seen = new Set();
        lops.forEach(l => {
            if (l.ds_mon_hoc_full) {
                l.ds_mon_hoc_full.split('||').forEach(m => {
                    const k = `${m.trim()}-${l.ten_lop}`;
                    if (!seen.has(k)) { moduleNotes.push({ name: m.trim(), lop: l.ten_lop }); seen.add(k); }
                });
            }
        });

        const half = Math.ceil(moduleNotes.length / 2);
        for (let i = 0; i < half; i++) {
            const row = sheet.getRow(cur);
            row.getCell(2).value = moduleNotes[i].name;
            row.getCell(3).value = moduleNotes[i].lop;
            if (moduleNotes[i + half]) {
                // Đưa về cột 4 (D) và 5 (E) cho gần
                row.getCell(4).value = moduleNotes[i + half].name;
                row.getCell(5).value = moduleNotes[i + half].lop;
            }
            row.eachCell(c => c.font = { name: 'Times New Roman', size: 13 });
            cur++;
        }

        cur += 2;
        const titles = ['PHÒNG KH-TC', 'PHÒNG QT-TB', 'P.TRƯỞNG KHOA', 'NGƯỜI TỔNG HỢP'];
        const titleCols = [2, 5, 7, 10]; 
        titles.forEach((t, i) => {
            const cell = sheet.getCell(cur, titleCols[i]);
            cell.value = t;
            cell.font = { bold: true, name: 'Times New Roman', size: 13 };
            cell.alignment = { horizontal: 'center' };
        });

        sheet.columns = [
            { width: 4 }, { width: 8 }, { width: 25 }, { width: 10 }, { width: 12 }, 
            { width: 15 }, { width: 25 }, { width: 30 }, { width: 15 }, { width: 25 }, 
            { width: 20 }, { width: 12 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Bao_Cao_Tong_Hop.xlsx`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
}
};