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

router
  .route('/:id')
  .get(orderController.getOrder)
  .patch(orderController.updateOrderStatus);

module.exports = router;
