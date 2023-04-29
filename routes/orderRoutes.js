const express = require('express');
const authController = require('./../controllers/authController');

const orderController = require('./../controllers/orderController');

const router = express.Router();

router.use(authController.protect);

// Get all order user(account) go to user route /getMe or something like that
router
  .route('/')
  .get(authController.restrictTo('admin'), orderController.getAllOrders)
  .post(orderController.getMe, orderController.createNewOrder);
// UserId get from logged user
router.route('/user').get(orderController.getAllOrdersByUser);

// viết cập nhật done cho order riêng
router
  .route('/:id')
  .get(orderController.getOrder)
  .patch(authController.restrictTo('admin'), orderController.updateOrderStatus)
  .delete(orderController.updateToFail, orderController.updateOrderStatus);

module.exports = router;
