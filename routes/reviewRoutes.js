const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });
// router.get('/', reviewController.getAllReviews);
// router.post('/', authController.protect, reviewController.createNewReview);
// { mergeParams: true } nhờ vào cái này mà thg createNewReview sẽ truy cập được param.tourId nếu endpoint là product/:productId/reviews
router.use(authController.protect);
// Chưa check đã mua hàng rồi thì mới được createNewReview
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createNewReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );
module.exports = router;
