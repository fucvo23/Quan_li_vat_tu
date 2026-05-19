const db = require('../config/db');

module.exports = {
    // 1. Lấy danh sách năm học
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM nam_hoc ORDER BY id DESC');
            res.render('namhoc/index', { data: rows }); 
        } catch (error) {
            console.error("Lỗi lấy danh sách năm học:", error);
            res.status(500).send("Lỗi máy chủ khi tải dữ liệu!");
        }
    },

    // 2. Thêm mới năm học
    add: async (req, res) => {
        try {
            let { hoc_ky, nam_hoc } = req.body;

            // 1. Chuẩn hóa dữ liệu
            hoc_ky = hoc_ky ? hoc_ky.trim() : "";
            
            // Regex này sẽ tìm dấu "-" và xóa hết khoảng trắng trước/sau nó
            nam_hoc = nam_hoc ? nam_hoc.trim().replace(/\s*-\s*/g, "-") : "";

            if (!hoc_ky || !nam_hoc) {
                return res.send(`<script>alert("Vui lòng nhập đầy đủ!"); window.history.back();</script>`);
            }

            // 2. Kiểm tra trùng (Lúc này nam_hoc đã là "2025-2026" nên check rất chuẩn)
            const [existing] = await db.query(
                'SELECT id FROM nam_hoc WHERE hoc_ky = ? AND nam_hoc = ?', 
                [hoc_ky, nam_hoc]
            );

            if (existing.length > 0) {
                return res.send(`<script>alert("Học kỳ ${hoc_ky} năm ${nam_hoc} đã tồn tại!"); window.history.back();</script>`);
            }

            // 3. Lưu vào DB
            await db.query('INSERT INTO nam_hoc (hoc_ky, nam_hoc) VALUES (?, ?)', [hoc_ky, nam_hoc]);
            res.redirect('/nam-hoc');

        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi thêm dữ liệu!");
        }
    },

    // 3. Cập nhật năm học
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const hoc_ky = req.body.hoc_ky ? req.body.hoc_ky.trim() : "";
            const nam_hoc = req.body.nam_hoc ? req.body.nam_hoc.trim() : "";

            if (!hoc_ky || !nam_hoc) {
                return res.send(`<script>alert("Dữ liệu cập nhật không được để trống!"); window.history.back();</script>`);
            }

            // Kiểm tra xem tên mới có bị trùng với các hàng khác không
            const [existing] = await db.query(
                'SELECT id FROM nam_hoc WHERE hoc_ky = ? AND nam_hoc = ? AND id != ?', 
                [hoc_ky, nam_hoc, id]
            );

            if (existing.length > 0) {
                return res.send(`<script>alert("Lỗi: Thông tin này đã trùng với một học kỳ khác!"); window.history.back();</script>`);
            }

            await db.query('UPDATE nam_hoc SET hoc_ky = ?, nam_hoc = ? WHERE id = ?', [hoc_ky, nam_hoc, id]);
            res.redirect('/nam-hoc');

        } catch (error) {
            console.error("Lỗi cập nhật năm học:", error);
            res.status(500).send("Không thể cập nhật!");
        }
    },

    // 4. Xóa năm học
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            // Database của Phúc có Foreign Key, nếu đang có lớp học thuộc năm này, lệnh xóa sẽ lỗi
            await db.query('DELETE FROM nam_hoc WHERE id = ?', [id]);
            res.redirect('/nam-hoc');

        } catch (error) {
            console.error("Lỗi xóa năm học:", error);
            // Thông báo thân thiện khi không xóa được do ràng buộc khóa ngoại
            res.send(`
                <script>
                    alert("KHÔNG THỂ XÓA! Năm học này đang có các lớp học tham chiếu đến.\\nBạn phải xóa các lớp học thuộc năm này trước.");
                    window.location.href = '/nam-hoc';
                </script>
            `);
        }
    }
};