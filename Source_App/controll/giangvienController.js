const db = require('../config/db');

module.exports = {
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM giang_vien ORDER BY id DESC');
            res.render('giangvien/index', { data: rows }); 
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi lấy dữ liệu giảng viên!");
        }
    },

    add: async (req, res) => {
        try {
            // Dùng trim() để loại bỏ khoảng trắng thừa
            const ho_ten = req.body.ho_ten ? req.body.ho_ten.trim() : "";

            if (!ho_ten) {
                return res.status(400).send(`<script>alert("Tên giảng viên không được để trống!"); window.history.back();</script>`);
            }

            const [existing] = await db.query(
                'SELECT id FROM giang_vien WHERE ho_ten = ?', 
                [ho_ten]
            );

            if (existing.length > 0) {
                return res.status(400).send(`<script>alert("Giảng viên '${ho_ten}' đã có trong hệ thống!"); window.history.back();</script>`);
            }

            await db.query('INSERT INTO giang_vien (ho_ten) VALUES (?)', [ho_ten]);
            res.redirect('/giang-vien');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi thêm giảng viên!");
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params; 
            const ho_ten = req.body.ho_ten ? req.body.ho_ten.trim() : "";

            if (!ho_ten) {
                return res.status(400).send(`<script>alert("Tên không được để trống!"); window.history.back();</script>`);
            }
            
            const [existing] = await db.query(
                'SELECT id FROM giang_vien WHERE ho_ten = ? AND id != ?', 
                [ho_ten, id]
            );

            if (existing.length > 0) {
                return res.status(400).send(`<script>alert("Tên giảng viên này đã bị trùng!"); window.history.back();</script>`);
            }
            
            await db.query('UPDATE giang_vien SET ho_ten = ? WHERE id = ?', [ho_ten, id]);
            res.redirect('/giang-vien');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi cập nhật!");
        }
    },

    delete: async (req, res) => {
        try {
            await db.query('DELETE FROM giang_vien WHERE id = ?', [req.params.id]);
            res.redirect('/giang-vien');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi xóa!");
        }
    }
};