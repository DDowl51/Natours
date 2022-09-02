const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const generateToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    // 过期时间：7天
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Can't be modified in browser
  };

  // Send cookie only in production
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // Send only in https
  res.cookie('jwt', token, cookieOptions);

  const returnObj = {
    status: 'success',
    token,
    // data: { user },
  };

  user.password = undefined;
  user.confirmToken = undefined;

  if (statusCode === 201) returnObj.data = user;

  res.status(statusCode).json(returnObj);
};

exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);
  //   只提取需要的数据
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    photo: req.body.photo,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const confirmToken = newUser.createConfirmToken();
  await newUser.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const confirmUrl = `${req.protocol}://${req.get(
      'host'
    )}/confirm/${confirmToken}`;
    const photoUrl = `${req.protocol}://${req.get('host')}/me`;
    const data = { confirmUrl, photoUrl };
    await new Email(newUser, data).sendWelcome();
    createSendToken(newUser, 201, res); // Login JWT
  } catch (error) {
    // reset passwordResetToken & passwordResetExpires
    newUser.confirmToken = undefined;
    await newUser.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.confirmUser = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({ confirmToken: hashedToken });

  if (!user) return next(new AppError('Token is invalid.', 400));

  // 2) Check if user is already confirmed
  if (user.confirmed) return next(new AppError('User is already confirmed!'));

  // 3) Set confirmed to true
  user.confirmed = true;
  user.confirmToken = undefined;
  await user.save({ validateBeforeSave: false });

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));

  // 2) Checkid user exist and password is correct
  const user = await User.findOne({ email }).select('+password'); // 手动选择password字段，因为在userSchema中设置了select: false

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Incorrect email or password!', 401));

  // 3) If everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  // 使用一个不含任何token的cookie代替当前包含jwt的cookie以此来实现logout
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) Get token and check if it exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  // 2) Verification token
  // node内置函数promisify, 使要调用callback的async函数直接返回一个promise
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 后两步加强Security, just double check if token for that user is still valid
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select('+confirmed');
  if (!currentUser)
    return next(
      new AppError('The user belonging to this token does not exist', 401)
    );

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );

  // 5) Check if user is confirmed his signup
  if (!currentUser.confirmed)
    return next(
      new AppError(
        'User not confirmed! Please click the link in the email to confirm the account.',
        401
      )
    );

  // 将用户数据放入req.user
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages and there will be no errors
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Verify token
      // node内置函数promisify, 使要调用callback的async函数直接返回一个promise
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // 后两步加强Security, just double check if token for that user is still valid
      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id).select('+confirmed');
      if (!currentUser) return next();

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) return next();

      // 4) Check if user is confirmed his signup
      // FIXED: isLoggedIn 函数不应该检查用户是否已经确认注册
      // if (!currentUser.confirmed) return next();

      // 用户已登录
      // pug模板可以访问res.locals中的所有变量
      // pug中可以访问user变量
      res.locals.user = currentUser;
    }
  } catch (error) {
    console.log(error.message);
  }
  next();
};

// 只有roles中的用户才能执行操作
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with email address.', 404));

  // 2） Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, { resetUrl }).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: `Token sent to email!`,
    });
  } catch (error) {
    // reset passwordResetToken & passwordResetExpires
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 根据Token查找用户，同时passwordResetExpires要大于当前的时间戳
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired and there is user, set new password
  if (!user) return next(new AppError('Token is invalid or has expired.', 400));

  // 3) Update changedPasswordAt property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  // const { user } = req;
  const user = await User.findById(req.user.id).select('password');

  // 2) Check if posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('Incorrect password!', 401));

  // 3) If so, then update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
