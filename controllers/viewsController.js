const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get all tours data from collection
  let toursQuery = Tour.find();

  // 2) Build templates

  // 3) Check if there are any search query and if so, filter it
  let { search } = req.query;
  if (search) {
    search = search.replaceAll('+', ' ');
    toursQuery = toursQuery.find({
      $or: [
        {
          name: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          summary: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          description: {
            $regex: search,
            $options: 'i',
          },
        },
      ],
    });
  } else {
    req.originalUrl = req.originalUrl.split('?')[0];
  }

  const tours = await toursQuery;
  // 4) Render that template using tour data from 1)

  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data for the requested tour, (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) return next(new AppError('There is no tour with that name.', 404));

  // 2) Build template

  // 3) Render template using the data from 1)

  // render base.pug文件, 由于在之前已经定义了views文件夹的位置, 因此express会自动在该路径下寻找
  res.status(200).render('tour', {
    title: tour.name,
    tour,
    // reviews,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Login',
  });
};

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', { title: 'Sign up' });
};

exports.confirmUser = (req, res) => {
  res.status(200).render('confirm', {
    title: 'Confirming',
    msg: 'Loading... Please wait for a second.',
    token: req.params.token,
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', { title: 'Your account' });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name: req.body.name, email: req.body.email },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map(booking => booking.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My tours',
    tours,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  // 1) Get all reviews for user
  const reviews = await Review.find({ user: req.user.id }).populate({
    path: 'tour',
    select: 'name imageCover',
  });

  // 2) Render the reviews page
  res.status(200).render('reviews', {
    title: 'My reviews',
    reviews,
  });
});
