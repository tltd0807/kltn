const express = require('express');
const authController = require('./../controllers/authController');
const productController = require('./../controllers/productController');
// const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();
// router.use('/:productId/reviews', reviewRouter);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router
  .route('/:id')
  .post(
    productController.uploadProductImages,
    productController.resizeProductImages,
    productController.createNewProduct
  )
  .patch(
    productController.uploadProductImages,
    productController.resizeProductImages,
    productController.updateProduct
  )
  .delete(productController.deleteProduct);
module.exports = router;
