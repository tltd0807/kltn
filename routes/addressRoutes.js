const express = require('express');
const authController = require('./../controllers/authController');
const addressController = require('./../controllers/addressController');

const router = express.Router();
router.use(authController.protect);
router.use(authController.restrictTo('user'));
router.use(addressController.setUserId);
router
  .route('/')
  .get(addressController.getAllAddresss)
  .post(addressController.createNewAddress);

router
  .route('/:id')
  .get(addressController.getAddress)
  .patch(addressController.updateAddress)
  .delete(addressController.deleteAddress);

module.exports = router;
