const express = require('express');
const authController = require('./../controllers/authController');
const productController = require('./../controllers/productController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();
router.use('/:productId/reviews', reviewRouter);
router.get('/', productController.getAllProducts);
router.route('/product-stats').get(productController.getProductStats);
router.route('/best-seller/:top').get(productController.bestSeller);

router.get('/:id', productController.getProductById);

router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .post(
    productController.uploadProductImages,
    productController.resizeProductImages,
    productController.checkId,
    productController.createNewProduct
  );
router
  .route('/:id')
  .patch(
    productController.uploadProductImages,
    productController.resizeProductImages,
    productController.updateProductInventory,
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

module.exports = router;
