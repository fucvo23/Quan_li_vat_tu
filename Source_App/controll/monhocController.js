const db = require('../config/db');

module.exports = {
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM mon_hoc ORDER BY id DESC');
            res.render('monhoc/index', { data: rows }); 
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
            res.status(500).send("Lỗi máy chủ!");
        }
    },

    add: async (req, res) => {
        try {
            // Trim tên môn học ngay khi nhận dữ liệu
            const ten_mon_hoc = req.body.ten_mon_hoc ? req.body.ten_mon_hoc.trim() : "";

            if (!ten_mon_hoc) {
                return res.send(`<script>alert("Tên môn học không được để trống!"); window.history.back();</script>`);
            }

            const [existing] = await db.query(
                'SELECT id FROM mon_hoc WHERE ten_mon_hoc = ?', 
                [ten_mon_hoc]
            );

            if (existing.length > 0) {
                return res.send(`<script>alert("Môn học '${ten_mon_hoc}' đã tồn tại!"); window.history.back();</script>`);
            }

            await db.query('INSERT INTO mon_hoc (ten_mon_hoc) VALUES (?)', [ten_mon_hoc]);
            res.redirect('/mon-hoc');
        } catch (error) {
            console.error("Lỗi thêm:", error);
            res.status(500).send("Không thể thêm dữ liệu!");
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const ten_mon_hoc = req.body.ten_mon_hoc ? req.body.ten_mon_hoc.trim() : "";

            if (!ten_mon_hoc) {
                return res.send(`<script>alert("Tên môn học không được để trống!"); window.history.back();</script>`);
            }

            const [existing] = await db.query(
                'SELECT id FROM mon_hoc WHERE ten_mon_hoc = ? AND id != ?', 
                [ten_mon_hoc, id]
            );

            if (existing.length > 0) {
                return res.send(`<script>alert("Tên môn học mới đã trùng!"); window.history.back();</script>`);
            }

            await db.query('UPDATE mon_hoc SET ten_mon_hoc = ? WHERE id = ?', [ten_mon_hoc, id]);
            res.redirect('/mon-hoc');
        } catch (error) {
            console.error("Lỗi cập nhật:", error);
            res.status(500).send("Không thể cập nhật!");
        }
    },

    delete: async (req, res) => {
        try {
            await db.query('DELETE FROM mon_hoc WHERE id = ?', [req.params.id]);
            res.redirect('/mon-hoc');
        } catch (error) {
            console.error("Lỗi xóa:", error);
            // Thêm cảnh báo nếu môn học đã được dùng trong bảng Phân công hay Vật tư
            res.status(500).send("Không thể xóa môn học này vì có thể đã được sử dụng trong các dữ liệu khác!");
        }
    }
};