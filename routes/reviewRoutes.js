const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// POST /tour/:tourId/reviews
// GET /tour/:tourId/reviews
// GET /tour/:tourId/reviews/:id

// 可以访问到tourRouter中的参数: tourId, 即将之前线路中的参数merge/合并到当前的router种
const router = express.Router({ mergeParams: true });

// 所有review操作都需要登录
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  );

module.exports = router;
