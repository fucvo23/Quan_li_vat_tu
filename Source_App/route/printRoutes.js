const express = require('express');
const router = express.Router();
const printController = require('../controll/printController');

router.get('/', printController.index);
router.get('/by-lop', printController.printByLop);
router.get('/by-hoc-ky-tien', printController.printByHocKyCoTien); 
router.get('/get-lops/:nam_hoc_id', printController.getLopsByNamHoc);
module.exports = router;