const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

// { mergeParams: true } nhờ vào cái này mà thg createNewReview sẽ truy cập được param.tourId nếu endpoint là product/:productId/reviews
router.use(authController.protect);
// get đây là get all từ admin
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    reviewController.setProductUserIds,
    reviewController.checkReviewIsValid,
    reviewController.createNewReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(authController.restrictTo('admin'), reviewController.updateReview)
  .delete(authController.restrictTo('admin'), reviewController.deleteReview);
module.exports = router;
