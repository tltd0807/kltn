const express = require('express');
const authController = require('./../controllers/authController');
const categoryController = require('./../controllers/categoryController');

const router = express.Router();

router.get('/', categoryController.getAllCategorys);
router.get('/:id', categoryController.getCategoryById);
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router
  .route('/:id')
  .post(categoryController.createNewCategory)
  .patch(categoryController.updateCategory);

module.exports = router;
