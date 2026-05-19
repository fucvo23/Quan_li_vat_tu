const db = require('../config/db');
const ExcelJS = require('exceljs');
module.exports = {
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT *, 0 as so_luong FROM vat_tu ORDER BY id DESC');
            res.render('vattu/index', { data: rows }); 
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi máy chủ!");
        }
    },

    add: async (req, res) => {
        try {
            const { ten_hang, don_gia, don_vi_tinh } = req.body;
            if (!ten_hang || !don_vi_tinh) {
                return res.send(`<script>alert("Tên hàng và Đơn vị tính là bắt buộc!"); window.history.back();</script>`);
            }

            // Dùng Math.abs để đảm bảo nếu nhập -50000 thì nó sẽ lưu thành 50000
            const giaTriGia = Math.abs(Number(don_gia) || 0);

            const [existing] = await db.query('SELECT id FROM vat_tu WHERE ten_hang = ?', [ten_hang.trim()]);
            if (existing.length > 0) {
                return res.send(`<script>alert("Vật tư '${ten_hang}' đã tồn tại!"); window.history.back();</script>`);
            }

            const insertData = {
                ten_hang: ten_hang.trim(),
                don_vi_tinh: don_vi_tinh,
                hang_san_xuat: req.body.hang_san_xuat || '',
                thong_so_ky_thuat: req.body.thong_so_ky_thuat || '',
                so_luong: 0,
                don_gia: giaTriGia,
                is_dmktkt: req.body.is_dmktkt ? 1 : 0,
            };

            await db.query('INSERT INTO vat_tu SET ?', insertData);
            res.redirect('/vat-tu');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi thêm vật tư!");
        }
    },

 update: async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_hang, don_gia, don_vi_tinh } = req.body;

        // 1. Chặn số âm (như đã thống nhất)
        if (Number(don_gia) < 0) {
            return res.send(`
                <script>
                    alert("Lỗi: Đơn giá không được là số âm!");
                    window.history.back();
                </script>
            `);
        }

        // 2. KIỂM TRA TRÙNG TÊN: 
        // Tìm xem có thằng nào tên giống vậy mà ID lại khác thằng đang sửa không
        const [existing] = await db.query(
            'SELECT id FROM vat_tu WHERE ten_hang = ? AND id != ?', 
            [ten_hang.trim(), id]
        );

        if (existing.length > 0) {
            return res.send(`
                <script>
                    alert("Lỗi: Tên hàng hóa '${ten_hang}' đã tồn tại trong hệ thống!");
                    window.history.back();
                </script>
            `);
        }

        // 3. Nếu mọi thứ ổn thì tiến hành Update
        const updateData = {
            ten_hang: ten_hang.trim(),
            don_vi_tinh: don_vi_tinh || '',
            hang_san_xuat: req.body.hang_san_xuat || '',
            thong_so_ky_thuat: req.body.thong_so_ky_thuat || '',
            so_luong: 0,
            don_gia: Number(don_gia) || 0,
            is_dmktkt: (req.body.is_dmktkt === '1' || req.body.is_dmktkt === 'on') ? 1 : 0
        };

        await db.query('UPDATE vat_tu SET ? WHERE id = ?', [updateData, id]);
        res.redirect('/vat-tu');
    } catch (error) {
        console.error("🔥 Lỗi Update:", error.message);
        res.status(500).send("Lỗi cập nhật!");
    }
},

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            // Đã loại bỏ hoàn toàn việc check bảng phan_cong_vat_tu theo yêu cầu
            await db.query('DELETE FROM vat_tu WHERE id = ?', [id]);
            res.redirect('/vat-tu');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi hệ thống khi xóa!");
        }
    },
    exportExcel: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM vat_tu ORDER BY ten_hang ASC');
            const workbook = new ExcelJS.Workbook();
            workbook.calcProperties.fullCalcOnLoad = true;
            
            const mainSheet = workbook.addWorksheet('PhieuDeXuat');
            mainSheet.properties.defaultRowHeight = 25; 
            const globalFont = { name: 'Times New Roman', size: 13 };

            // 1. Cấu hình độ rộng cột
            mainSheet.columns = [
                { width: 8 }, { width: 40 }, { width: 12 }, { width: 15 }, { width: 12 }, 
                { width: 20 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 12 }
            ];

            // 2. PHẦN ĐẦU (Sửa đổi theo Ảnh 3 để đầy đủ thông tin)
            // Header trường và quốc hiệu
            mainSheet.mergeCells('A1:D1');
            mainSheet.getCell('A1').value = 'TRƯỜNG CAO ĐẲNG NGHỀ CẦN THƠ';
            mainSheet.mergeCells('A2:D2');
            mainSheet.getCell('A2').value = 'KHOA CƠ KHÍ';
            mainSheet.getCell('A2').font = { ...globalFont, bold: true };

            mainSheet.mergeCells('G1:J1');
            mainSheet.getCell('G1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
            mainSheet.getCell('G1').font = { ...globalFont, bold: true };
            mainSheet.getCell('G1').alignment = { horizontal: 'center' };
            mainSheet.mergeCells('G2:J2');
            mainSheet.getCell('G2').value = 'Độc lập – Tự do – Hạnh phúc';
            mainSheet.getCell('G2').font = { ...globalFont, bold: true, underline: true };
            mainSheet.getCell('G2').alignment = { horizontal: 'center' };

            mainSheet.mergeCells('G5:I5');
            mainSheet.getCell('G5').value = 'Cần Thơ, ngày      tháng      năm';
            mainSheet.getCell('G5').font = { ...globalFont, italic: true };
            mainSheet.getCell('G5').alignment = { horizontal: 'right' };

            // Tiêu đề bảng
            mainSheet.mergeCells('A6:J6');
            mainSheet.getCell('A6').value = 'BẢNG ĐỀ NGHỊ VÀ DỰ TRÙ CỦA GIÁO VIÊN';
            mainSheet.getCell('A6').font = { ...globalFont, bold: true, size: 15 };
            mainSheet.getCell('A6').alignment = { horizontal: 'center' };

            mainSheet.mergeCells('A7:J7');
            mainSheet.getCell('A7').value = 'VẬT TƯ THỰC TẬP HỌC KỲ ....... NĂM HỌC .......';
            mainSheet.getCell('A7').font = { ...globalFont, bold: true };
            mainSheet.getCell('A7').alignment = { horizontal: 'center' };

            // FIX: Thêm thông tin giáo viên, sinh viên (Dòng 9 - 11)
            mainSheet.mergeCells('A9:J9');
            mainSheet.getCell('A9').value = 'Họ và tên giáo viên: ...................................................................................................................................';
            mainSheet.getCell('A9').font = globalFont;

            mainSheet.mergeCells('A10:J10');
            mainSheet.getCell('A10').value = 'Tổng số sinh viên: .....................................................................................................................................';
            mainSheet.getCell('A10').font = globalFont;

            mainSheet.mergeCells('A11:J11');
            mainSheet.getCell('A11').value = 'Chi tiết: ......................................................................................................................................................';
            mainSheet.getCell('A11').font = globalFont;

            // 3. PHẦN BẢNG - TIÊU ĐỀ (Dòng 14)
            const tableHeaderRow = 14;
            const headers = ['STT', 'Tên VTTT', 'ĐVT', 'Đơn giá', 'Số lượng', 'Thành tiền', 'Thông số kỹ thuật', 'Lớp', 'Mô đun', 'ĐMKTKT'];
            const headerRow = mainSheet.getRow(tableHeaderRow);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { ...globalFont, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });

            // Tạo danh mục ẩn
            const dataSheet = workbook.addWorksheet('Data_Hidden', { state: 'hidden' });
            rows.forEach(r => {
                dataSheet.addRow([r.ten_hang, r.don_vi_tinh || "", Number(r.don_gia) || 0, r.thong_so_ky_thuat || "", r.is_dmktkt ? "Có" : "Không"]);
            });
            const dataRange = `Data_Hidden!$A$1:$E$${rows.length}`;

            // 4. TẠO 20 HÀNG CÓ SẴN CÔNG THỨC (Dòng 15 - 34)
            const startDataRow = 15;
            const numberOfReadyRows = 20;

            for (let i = 0; i < numberOfReadyRows; i++) {
                const rNum = startDataRow + i;
                const row = mainSheet.getRow(rNum);
                
                row.getCell(1).value = i + 1;
                row.getCell(2).dataValidation = {
                    type: 'list', allowBlank: true,
                    formulae: [`Data_Hidden!$A$1:$A$${rows.length}`]
                };

                // FIX #VALUE: Sử dụng IF kết hợp ISNUMBER hoặc kiểm tra rỗng để tính Thành tiền
                row.getCell(3).value = { formula: `=IF(OR(B${rNum}="",ISNA(VLOOKUP(B${rNum},${dataRange},2,0))),"",VLOOKUP(B${rNum},${dataRange},2,0))` };
                row.getCell(4).value = { formula: `=IF(OR(B${rNum}="",ISNA(VLOOKUP(B${rNum},${dataRange},3,0))),0,VLOOKUP(B${rNum},${dataRange},3,0))` };
                row.getCell(5).value = 0;
                // Thành tiền: Nếu đơn giá hoặc số lượng không phải số thì hiện 0 thay vì #VALUE
                row.getCell(6).value = { formula: `=IF(ISNUMBER(D${rNum}*E${rNum}), D${rNum}*E${rNum}, 0)` };
                row.getCell(7).value = { formula: `=IF(OR(B${rNum}="",ISNA(VLOOKUP(B${rNum},${dataRange},4,0))),"",VLOOKUP(B${rNum},${dataRange},4,0))` };
                row.getCell(10).value = { formula: `=IF(OR(B${rNum}="",ISNA(VLOOKUP(B${rNum},${dataRange},5,0))),"",VLOOKUP(B${rNum},${dataRange},5,0))` };

                // FIX BORDER: Duyệt qua tất cả 10 cột để đảm bảo kẻ khung đầy đủ (bao gồm cả cột trống H, I)
                for (let j = 1; j <= 10; j++) {
                    const cell = row.getCell(j);
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    cell.font = globalFont;
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    if (j === 2 || j === 7) cell.alignment.horizontal = 'left';
                    if (j === 4 || j === 6) cell.numFmt = '#,##0';
                }
            }

            // 5. DÒNG TỔNG CỘNG (Dòng 35)
            const totalRowIndex = startDataRow + numberOfReadyRows;
            mainSheet.mergeCells(`A${totalRowIndex}:E${totalRowIndex}`);
            mainSheet.getCell(`A${totalRowIndex}`).value = 'TỔNG CỘNG';
            
            // Công thức SUM cho cột Thành tiền
            mainSheet.getCell(totalRowIndex, 6).value = { 
                formula: `=SUM(F${startDataRow}:F${totalRowIndex - 1})` 
            };
            
            // Định dạng và kẻ khung dòng tổng cộng cho đủ 10 cột
            for (let j = 1; j <= 10; j++) {
                const cell = mainSheet.getCell(totalRowIndex, j);
                cell.font = { ...globalFont, bold: true };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                if (j === 6) cell.numFmt = '#,##0';
            }

            // 6. PHẦN CHỮ KÝ (Dòng footer)
            const footerStart = totalRowIndex + 2;
            mainSheet.mergeCells(`A${footerStart}:J${footerStart}`);
            mainSheet.getCell(`A${footerStart}`).value = 'Viết bằng chữ: .....................................................................................................................................................................';
            mainSheet.getCell(`A${footerStart}`).font = { ...globalFont, italic: true };

            mainSheet.mergeCells(`A${footerStart + 1}:J${footerStart + 1}`);
            mainSheet.getCell(`A${footerStart + 1}`).value = 'MĐ: ....................';
            mainSheet.getCell(`A${footerStart + 1}`).font = globalFont;

            mainSheet.getCell(`C${footerStart + 3}`).value = 'KHOA CƠ KHÍ';
            mainSheet.getCell(`H${footerStart + 3}`).value = 'GIÁO VIÊN LẬP';
            mainSheet.getCell(`C${footerStart + 3}`).font = mainSheet.getCell(`H${footerStart + 3}`).font = { ...globalFont, bold: true };
            mainSheet.getCell(`C${footerStart + 3}`).alignment = mainSheet.getCell(`H${footerStart + 3}`).alignment = { horizontal: 'center' };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Phieu_De_Xuat_Vat_Tu.xlsx');
            await workbook.xlsx.write(res);
            res.status(200).end();

        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi hệ thống: " + error.message);
        }
    }
};