const db = require('../config/db');

module.exports = {
    // ... (Hàm getAll giữ nguyên vì đã JOIN rất tốt)
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT lop_hoc.*, nam_hoc.nam_hoc, nam_hoc.hoc_ky 
                FROM lop_hoc 
                JOIN nam_hoc ON lop_hoc.nam_hoc_id = nam_hoc.id 
                ORDER BY lop_hoc.id DESC
            `);
            const [namHocList] = await db.query('SELECT * FROM nam_hoc');
            res.render('lophoc/index', { data: rows, namHocList: namHocList }); 
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi lấy danh sách lớp!");
        }
    },
    add: async (req, res) => {
        try {
            const si_so = parseInt(req.body.si_so) || 0;
            const hoc_phi = parseInt(req.body.hoc_phi) || 0;
            const ty_le = parseFloat(req.body.ty_le_chi_vat_tu) || 0;
            const tien_khoan = parseInt(req.body.tien_khoan_vat_tu) || 0; // Bổ sung thêm dòng này

            // Kiểm tra tất cả các ô số
            if (si_so < 0 || hoc_phi < 0 || ty_le < 0 || tien_khoan < 0) {
                return res.send(`
                    <script>
                        alert("Lỗi: Các giá trị số không được phép nhỏ hơn 0!");
                        window.history.back();
                    </script>
                `);
            }

            // 3. Nếu mọi thứ ổn, mới tiến hành kiểm tra trùng tên lớp
            const { ten_lop, nam_hoc_id } = req.body;
            const [existing] = await db.query(
                'SELECT id FROM lop_hoc WHERE ten_lop = ? AND nam_hoc_id = ?', 
                [ten_lop.trim(), nam_hoc_id]
            );

            if (existing.length > 0) {
                return res.status(400).send(`<script>alert("Lớp đã tồn tại!"); window.history.back();</script>`);
            }

            // 4. Lưu vào Database
            const data = {
                ...req.body,
                ten_lop: ten_lop.trim(),
                si_so: si_so,
                hoc_phi: hoc_phi,
                ty_le_chi_vat_tu: ty_le
            };

            await db.query('INSERT INTO lop_hoc SET ?', data);
            res.redirect('/lop-hoc');

        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi thêm dữ liệu!");
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { ten_lop, nam_hoc_id, si_so, hoc_phi, ty_le_chi_vat_tu, tien_khoan_vat_tu } = req.body;

            // 1. Kiểm tra số âm
            if (Number(si_so) < 0 || Number(hoc_phi) < 0 || Number(ty_le_chi_vat_tu) < 0 || Number(tien_khoan_vat_tu) < 0) {
                return res.status(400).send(`<script>alert("Dữ liệu số không được âm!"); window.history.back();</script>`);
            }

            // 2. Kiểm tra trùng tên (Logic này của bạn đã đúng)
            const [existing] = await db.query(
                'SELECT id FROM lop_hoc WHERE ten_lop = ? AND nam_hoc_id = ? AND id != ?', 
                [ten_lop.trim(), nam_hoc_id, id]
            );

            if (existing.length > 0) {
                return res.status(400).send(`<script>alert("Tên lớp bị trùng trong năm học này!"); window.history.back();</script>`);
            }

            // 3. Đóng gói dữ liệu CHUẨN (Chỉ lấy các cột có trong DB)
            const cleanData = {
                ten_lop: ten_lop.trim(),
                nam_hoc_id: nam_hoc_id,
                si_so: Number(si_so),
                hoc_phi: Number(hoc_phi),
                ty_le_chi_vat_tu: Number(ty_le_chi_vat_tu),
                tien_khoan_vat_tu: Number(tien_khoan_vat_tu)
            };
            
            await db.query('UPDATE lop_hoc SET ? WHERE id = ?', [cleanData, id]);
            
            // Chuyển hướng về đúng trang lớp học
            res.redirect('/lop-hoc');
        } catch (error) {
            console.error("Lỗi Update:", error);
            res.status(500).send("Lỗi khi cập nhật!");
        }
    },
    importExcel: async (req, res) => {
    try {
        const { data, nam_hoc_id } = req.body;
        if (!data || data.length === 0) return res.json({ success: false, message: "File trống trơn à bạn ơi!" });

        let thanhCong = 0;
        let thatBai = 0;
        let chiTietLoi = [];

        for (let [index, row] of data.entries()) {
            const stt = index + 1; // Số thứ tự hàng trong Excel để báo lỗi cho dễ tìm
            
            // 1. Kiểm tra tên cột (Nếu thiếu cột quan trọng thì bỏ qua hàng này)
            const ten_lop = row['TÊN LỚP']?.toString().trim();
            if (!ten_lop) {
                thatBai++;
                chiTietLoi.push(`Hàng ${stt}: Thiếu tên lớp.`);
                continue;
            }

            // 2. Ép kiểu dữ liệu & Xử lý số liệu
            const si_so = parseInt(row['SỈ SỐ']) || 0;
            const hoc_phi_sv = parseInt(row['Học phí/SV']) || 0;
            const ty_le_dinh_muc = parseFloat(row['Tỷ lệ % định mức']) || 0;
            const ty_le_chi = parseFloat(row['Tỷ lệ % Học phí']) || 0;
            const khoan = parseInt(row['Khoán vật tư']) || 0;

            // 3. Tính toán theo công thức khách yêu cầu
            let final_hoc_phi = (hoc_phi_sv * ty_le_dinh_muc) / 100;
            let final_ty_le = ty_le_chi;
            let final_khoan = khoan;

            // Ràng buộc: Có khoán thì thôi học phí
            if (final_khoan > 0) { 
                final_hoc_phi = 0; 
                final_ty_le = 0; 
            }

            try {
                // 4. Kiểm tra trùng lớp trong cùng Học kỳ
                const [check] = await db.query(
                    'SELECT id FROM lop_hoc WHERE ten_lop = ? AND nam_hoc_id = ?', 
                    [ten_lop, nam_hoc_id]
                );

                if (check.length > 0) {
                    thatBai++;
                    chiTietLoi.push(`Hàng ${stt}: Lớp "${ten_lop}" đã tồn tại.`);
                    continue;
                }

                // 5. Chèn vào DB
                await db.query('INSERT INTO lop_hoc SET ?', {
                    ten_lop, nam_hoc_id, si_so, 
                    hoc_phi: final_hoc_phi, 
                    ty_le_chi_vat_tu: final_ty_le, 
                    tien_khoan_vat_tu: final_khoan
                });
                thanhCong++;

            } catch (dbErr) {
                thatBai++;
                chiTietLoi.push(`Hàng ${stt}: Lỗi cơ sở dữ liệu.`);
            }
        }

        // Trả về báo cáo tổng kết
        let msg = `Đã nhập thành công ${thanhCong} lớp.`;
        if (thatBai > 0) {
            msg += `\nThất bại ${thatBai} hàng:\n` + chiTietLoi.join('\n');
        }

        res.json({ 
            success: thatBai === 0, // Chỉ coi là success hoàn toàn nếu không lỗi hàng nào
            message: msg 
        });

    } catch (error) {
        res.json({ success: false, message: "Lỗi hệ thống: " + error.message });
    }
},

    deleteFiltered: async (req, res) => {
        try {
            const { nam_hoc_id } = req.body;
            await db.query('DELETE FROM lop_hoc WHERE nam_hoc_id = ?', [nam_hoc_id]);
            res.json({ success: true, message: "Đã xóa toàn bộ lớp trong học kỳ này!" });
        } catch (error) {
            res.json({ success: false, message: "Lỗi xóa dữ liệu!" });
        }
    },
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            // Xóa thẳng tay, Database sẽ tự CASCADE các bảng liên quan
            await db.query('DELETE FROM lop_hoc WHERE id = ?', [id]);
            
            // Xóa xong quay về danh sách
            res.redirect('/lop-hoc');
        } catch (error) {
            console.error("Lỗi xóa lớp:", error);
            res.status(500).send(`<script>alert("Lỗi hệ thống khi xóa!"); window.history.back();</script>`);
        }
    }
};