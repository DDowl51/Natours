const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// POST /tour/:id/reviews
// GET /tour/:id/reviews
// GET /tour/:id/reviews/:id

// 这条线路使用reviewRouter
// 和app.js中的app.use()一样
router.use('/:tourId/reviews', reviewRouter);

// router.param('id', tourController.checkID);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// latlng 为用户当前坐标, distance为距离值
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

// 获取某一点到所有tour之间的距离
// {{url}}api/v1/tours/distances/34.111745,-118.113491/unit/mi
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// 根据给定的字符串搜索tour，基于regex
router.get('/search', tourController.searchTour);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
