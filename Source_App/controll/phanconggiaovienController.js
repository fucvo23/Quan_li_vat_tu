const db = require('../config/db');

module.exports = {
    getAll: async (req, res) => {
        try {
            // 1. Lấy danh sách phân công chi tiết (PHẢI VIẾT ĐẦY ĐỦ SQL)
            const [rows] = await db.query(`
                SELECT pc.*, gv.ho_ten, l.ten_lop, m.ten_mon_hoc, nh.hoc_ky, nh.nam_hoc 
                FROM phan_cong_giang_vien pc
                JOIN giang_vien gv ON pc.giang_vien_id = gv.id
                JOIN lop_hoc l ON pc.lop_hoc_id = l.id
                JOIN mon_hoc m ON pc.mon_hoc_id = m.id
                JOIN nam_hoc nh ON pc.nam_hoc_id = nh.id
                ORDER BY pc.id DESC
            `);

            // 2. Lấy dữ liệu cho các ô Select ở Form
            const [giangVienList] = await db.query("SELECT * FROM giang_vien ORDER BY ho_ten ASC");
            const [lopHocList] = await db.query("SELECT id, ten_lop, nam_hoc_id FROM lop_hoc");
            const [monHocList] = await db.query("SELECT * FROM mon_hoc ORDER BY ten_mon_hoc ASC");
            const [namHocList] = await db.query("SELECT * FROM nam_hoc ORDER BY nam_hoc DESC, hoc_ky DESC");

            // Render trang và truyền dữ liệu
            res.render('phanconggiaovien/index', { 
                data: rows,
                giangVienList,
                lopHocList,
                monHocList,
                namHocList
            });

        } catch (error) {
            console.error("Chi tiết lỗi tại getAll:", error);
            res.status(500).send("Lỗi máy chủ: Kiểm tra lại tên bảng hoặc câu lệnh SQL!");
        }
    },

    add: async (req, res) => {
        try {
            const { giang_vien_id, lop_hoc_id, mon_hoc_id, nam_hoc_id } = req.body;

            const [existing] = await db.query(
                'SELECT id FROM phan_cong_giang_vien WHERE giang_vien_id = ? AND lop_hoc_id = ? AND mon_hoc_id = ? AND nam_hoc_id = ?', 
                [giang_vien_id, lop_hoc_id, mon_hoc_id, nam_hoc_id]
            );

            if (existing.length > 0) {
                return res.status(400).send(`<script>alert("Phân công này đã tồn tại!"); window.history.back();</script>`);
            }

            await db.query('INSERT INTO phan_cong_giang_vien SET ?', req.body);
            res.redirect('/phan-cong-giao-vien');
        } catch (error) {
            console.error(error);
            res.status(500).send("Không thể thực hiện phân công!");
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            
            // Kiểm tra trùng lặp trừ bản ghi hiện tại
            const [existing] = await db.query(
                'SELECT id FROM phan_cong_giang_vien WHERE giang_vien_id = ? AND lop_hoc_id = ? AND mon_hoc_id = ? AND nam_hoc_id = ? AND id != ?', 
                [updateData.giang_vien_id, updateData.lop_hoc_id, updateData.mon_hoc_id, updateData.nam_hoc_id, id]
            );

            if (existing.length > 0) {
                return res.status(400).send(`<script>alert("Dữ liệu cập nhật bị trùng!"); window.history.back();</script>`);
            }

            await db.query('UPDATE phan_cong_giang_vien SET ? WHERE id = ?', [updateData, id]);
            res.redirect('/phan-cong-giao-vien');
        } catch (error) {
            console.error(error);
            res.status(500).send("Không thể cập nhật!");
        }
    },

    delete: async (req, res) => {
        try {
            await db.query('DELETE FROM phan_cong_giang_vien WHERE id = ?', [req.params.id]);
            res.redirect('/phan-cong-giao-vien');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi xóa!");
        }
    },
    importExcel: async (req, res) => {
    try {
        const { data } = req.body; 
        let successCount = 0;
        let errorDetails = []; // Mảng chứa chi tiết các dòng lỗi

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const rowNum = i + 1; // Số thứ tự để người dùng dễ tra cứu trong file

            // 1. Truy vấn thông tin
            const [
                [[gv]], 
                [[mon]], 
                [[lop]]
            ] = await Promise.all([
                db.query("SELECT id FROM giang_vien WHERE ho_ten = ?", [item.ten_gv]),
                db.query("SELECT id FROM mon_hoc WHERE ten_mon_hoc = ?", [item.ten_mon]),
                db.query("SELECT id FROM lop_hoc WHERE ten_lop = ? AND nam_hoc_id = ?", [item.ten_lop, item.nam_hoc_id])
            ]);

            // 2. Kiểm tra sự tồn tại
            if (!gv) {
                errorDetails.push(`Dòng ${rowNum}: Giảng viên "${item.ten_gv}" không tồn tại.`);
                continue;
            }
            if (!mon) {
                errorDetails.push(`Dòng ${rowNum}: Môn "${item.ten_mon}" không tồn tại.`);
                continue;
            }
            if (!lop) {
                errorDetails.push(`Dòng ${rowNum}: Lớp "${item.ten_lop}" không thuộc học kỳ này.`);
                continue;
            }

            // 3. Kiểm tra trùng lặp
            const [existing] = await db.query(
                `SELECT id FROM phan_cong_giang_vien 
                 WHERE giang_vien_id = ? AND lop_hoc_id = ? AND mon_hoc_id = ? AND nam_hoc_id = ?`,
                [gv.id, lop.id, mon.id, item.nam_hoc_id]
            );

            if (existing.length > 0) {
                errorDetails.push(`Dòng ${rowNum}: Phân công này đã tồn tại trong hệ thống.`);
                continue;
            }

            // 4. Thực hiện insert
            await db.query(
                `INSERT INTO phan_cong_giang_vien 
                 (giang_vien_id, lop_hoc_id, mon_hoc_id, nam_hoc_id) VALUES (?, ?, ?, ?)`,
                [gv.id, lop.id, mon.id, item.nam_hoc_id]
            );
            successCount++;
        }

        res.json({ 
            success: true, 
            successCount,
            errors: errorDetails,
            message: `Import hoàn tất: Thành công ${successCount}, Lỗi ${errorDetails.length}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi xử lý dữ liệu trên máy chủ!" });
    }
},
deleteBySemester: async (req, res) => {
    try {
        const { nam_hoc_id } = req.body;
        if (!nam_hoc_id) {
            return res.status(400).json({ success: false, message: "Thiếu ID học kỳ!" });
        }

        // Xóa tất cả phân công thuộc học kỳ này
        const [result] = await db.query(
            "DELETE FROM phan_cong_giang_vien WHERE nam_hoc_id = ?",
            [nam_hoc_id]
        );

        res.json({ 
            success: true, 
            message: `Đã xóa thành công ${result.affectedRows} phân công của học kỳ này.` 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi khi xóa dữ liệu học kỳ!" });
    }
}
};