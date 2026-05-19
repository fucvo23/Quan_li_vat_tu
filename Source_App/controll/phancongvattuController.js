const db = require('../config/db');

module.exports = {
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT pcvt.*, vt.ten_hang, gv.ho_ten, l.ten_lop, m.ten_mon_hoc, nh.hoc_ky, nh.nam_hoc, pcgv.nam_hoc_id
                FROM phan_cong_vat_tu pcvt
                LEFT JOIN vat_tu vt ON pcvt.vat_tu_id = vt.id
                LEFT JOIN phan_cong_giang_vien pcgv ON pcvt.phan_cong_gv_id = pcgv.id
                LEFT JOIN giang_vien gv ON pcgv.giang_vien_id = gv.id
                LEFT JOIN lop_hoc l ON pcgv.lop_hoc_id = l.id
                LEFT JOIN mon_hoc m ON pcgv.mon_hoc_id = m.id
                LEFT JOIN nam_hoc nh ON pcgv.nam_hoc_id = nh.id
                ORDER BY pcvt.id DESC
            `);
            const [namHocList] = await db.query("SELECT * FROM nam_hoc ORDER BY id DESC");
            const [pcgvList] = await db.query(`
                SELECT pc.id, gv.ho_ten, l.ten_lop, m.ten_mon_hoc, pc.nam_hoc_id
                FROM phan_cong_giang_vien pc
                JOIN giang_vien gv ON pc.giang_vien_id = gv.id
                JOIN lop_hoc l ON pc.lop_hoc_id = l.id
                JOIN mon_hoc m ON pc.mon_hoc_id = m.id
            `);
            const [vatTuList] = await db.query("SELECT * FROM vat_tu ORDER BY ten_hang ASC");
            
            res.render('phancongvattu/index', { data: rows, namHocList, pcgvList, vatTuList });
        } catch (error) {
            res.status(500).send("Lỗi hệ thống!");
        }
    },

    add: async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const { phan_cong_gv_id } = req.body;
            let vt_ids = req.body['vat_tu_ids[]'] || req.body.vat_tu_ids;
            let so_luong_list = req.body['so_luong[]'] || req.body.so_luong;

            if (!phan_cong_gv_id || !vt_ids) throw new Error("Thiếu thông tin phân bổ!");

            const dsVatTu = Array.isArray(vt_ids) ? vt_ids : [vt_ids];
            const dsSoLuong = Array.isArray(so_luong_list) ? so_luong_list : [so_luong_list];

            for (let i = 0; i < dsVatTu.length; i++) {
                const vt_id = dsVatTu[i];
                const sl_cap = parseFloat(dsSoLuong[i]); 
                if (isNaN(sl_cap) || sl_cap < 0) continue;

                const [existing] = await conn.query(
                    'SELECT id FROM phan_cong_vat_tu WHERE phan_cong_gv_id = ? AND vat_tu_id = ?',
                    [phan_cong_gv_id, vt_id]
                );

                if (existing.length > 0) {
                    await conn.query('UPDATE phan_cong_vat_tu SET so_luong = ? WHERE id = ?', [sl_cap, existing[0].id]);
                } else {
                    await conn.query('INSERT INTO phan_cong_vat_tu (phan_cong_gv_id, vat_tu_id, so_luong) VALUES (?, ?, ?)', [phan_cong_gv_id, vt_id, sl_cap]);
                }
            }
            await conn.commit();
            res.json({ success: true, message: "Cập nhật phân bổ thành công!" });
        } catch (error) {
            await conn.rollback();
            res.status(400).json({ success: false, message: error.message });
        } finally { conn.release(); }
    },

    deleteByFilter: async (req, res) => {
        try {
            const { nam_hoc_id, phan_cong_gv_id } = req.body;
            let query = `DELETE pcvt FROM phan_cong_vat_tu pcvt 
                         JOIN phan_cong_giang_vien pcgv ON pcvt.phan_cong_gv_id = pcgv.id 
                         WHERE 1=1`;
            let params = [];

            if (phan_cong_gv_id) {
                query += " AND pcvt.phan_cong_gv_id = ?";
                params.push(phan_cong_gv_id);
            } else if (nam_hoc_id) {
                query += " AND pcgv.nam_hoc_id = ?";
                params.push(nam_hoc_id);
            } else {
                return res.status(400).json({ success: false, message: "Chưa chọn bộ lọc để xóa!" });
            }

            const [result] = await db.query(query, params);
            res.json({ success: true, message: `Đã xóa sạch ${result.affectedRows} dòng dữ liệu!` });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Các hàm update, delete, getAllocated giữ nguyên logic chuyển đổi parseFloat 
    // nhưng nên sửa lại trả về res.json thay vì res.redirect để dùng SweetAlert2 đồng bộ.
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { phan_cong_gv_id, vat_tu_id, so_luong } = req.body;
            const sl_moi = parseFloat(so_luong) || 0;
            await db.query(`UPDATE phan_cong_vat_tu SET phan_cong_gv_id = ?, vat_tu_id = ?, so_luong = ? WHERE id = ?`, [phan_cong_gv_id, vat_tu_id, sl_moi, id]);
            res.json({ success: true, message: "Cập nhật thành công!" });
        } catch (error) { res.status(500).json({ success: false, message: error.message }); }
    },
    
    delete: async (req, res) => {
        try {
            await db.query('DELETE FROM phan_cong_vat_tu WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: "Đã xóa vật tư khỏi danh sách phân bổ!" });
        } catch (error) { res.status(500).json({ success: false, message: error.message }); }
    },

    getAllocated: async (req, res) => { /* Giữ nguyên như code cũ của bạn */ }
};