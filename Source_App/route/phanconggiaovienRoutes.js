const express = require('express');
const router = express.Router();
const pcController = require('../controll/phanconggiaovienController');

router.get('/', pcController.getAll); 

router.post('/add', pcController.add);
router.post('/update/:id', pcController.update); 
router.get('/delete/:id', pcController.delete);
router.post('/import-excel', pcController.importExcel);
router.post('/delete-by-semester', pcController.deleteBySemester);
module.exports = router;