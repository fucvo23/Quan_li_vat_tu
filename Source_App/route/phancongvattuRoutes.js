const express = require('express');
const router = express.Router();
const pcvtController = require('../controll/phancongvattuController');

router.get('/', pcvtController.getAll);
router.post('/add', pcvtController.add);
router.post('/update/:id', pcvtController.update);
router.get('/delete/:id', pcvtController.delete);

// ROUTE MỚI: Xóa theo bộ lọc và lấy dữ liệu AJAX
router.post('/delete-by-filter', pcvtController.deleteByFilter);
router.get('/get-allocated/:pcgv_id', pcvtController.getAllocated);

module.exports = router;