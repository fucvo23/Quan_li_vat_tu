const express = require('express');
const router = express.Router();
// Thay đổi tên Controller tương ứng ở mỗi file
const controller = require('../controll/lophocController'); 

router.get('/', controller.getAll);             // Xem danh sách
router.post('/add', controller.add);             // Xử lý thêm
router.post('/update/:id', controller.update);      // Xử lý cập nhật
router.get('/delete/:id', controller.delete);    // Xử lý xóa
router.post('/import-excel', controller.importExcel); // Route mới cho Excel
router.post('/delete-filtered', controller.deleteFiltered); // Route mới cho xóa lọc
module.exports = router;