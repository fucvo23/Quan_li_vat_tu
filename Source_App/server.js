const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// 1. CẤU HÌNH VIEW ENGINE
app.set('view engine', 'ejs');
// Đảm bảo thư mục view của bạn tên là 'view' (không có s)
app.set('views', path.join(__dirname, 'view')); 

// 2. MIDDLEWARES
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. KẾT NỐI DATABASE
const db = require('./config/db'); 
(async () => {
    try {
        await db.query('SELECT 1');
        console.log('✅ DATABASE: Kết nối thành công!');
    } catch (err) {
        console.error('❌ DATABASE: Lỗi kết nối ->', err.message);
    }
})();

// 4. IMPORT ROUTES
const giangVienRoutes = require('./route/giangvienRoutes');
const lopHocRoutes    = require('./route/lophocRoutes');
const monHocRoutes    = require('./route/monhocRoutes');
const namHocRoutes    = require('./route/namhocRoutes');
const vatTuRoutes     = require('./route/vattuRoutes');
const phanCongRoutes  = require('./route/phanconggiaovienRoutes');
const phanCongvattuRoutes = require('./route/phancongvattuRoutes');
const printRoutes = require('./route/printRoutes');
// 5. SỬ DỤNG ROUTES
app.get('/', (req, res) => {
    // Bạn có thể đổi sang '/phan-cong' làm trang chủ nếu muốn
    res.redirect('/vat-tu'); 
});

app.use('/giang-vien', giangVienRoutes);
app.use('/lop-hoc',   lopHocRoutes);
app.use('/mon-hoc',   monHocRoutes);
app.use('/nam-hoc',   namHocRoutes);
app.use('/vat-tu',    vatTuRoutes);
app.use('/phan-cong-giao-vien', phanCongRoutes);
app.use('/phan-bo-vat-tu', phanCongvattuRoutes);
app.use('/in-excel', printRoutes);
// XỬ LÝ LỖI 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Không tìm thấy trang' }); 
    // Hoặc giữ nguyên: res.status(404).send('<h1>404 - Không tìm thấy trang!</h1>');
});

// 7. KHỞI CHẠY
app.listen(port, () => {
    console.log(`🚀 SERVER: Đang chạy tại http://localhost:${port}`);
    console.log(`📅 Ngày khởi chạy: ${new Date().toLocaleString('vi-VN')}`);
});