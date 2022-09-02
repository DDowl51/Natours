const AppError = require('../utils/appError');

const handleCastErroDB = err =>
  new AppError(`Invalid ${err.path} with value ${err.value}`, 400);

const handleDuplicateFieldsDB = err => {
  const messages = [];
  Object.entries(err.keyValue).forEach(el => {
    const [name, value] = el;
    messages.push(
      `Duplicate field ${name}: ${value}. Please use another ${name}!`
    );
  });
  return new AppError(messages.join('\n'), 404);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(error => error.message);

  const message = errors.join('. ');

  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleExpireTokenJWT = () =>
  new AppError('Your token has expired! Please login again.', 401);

const sendErrorDev = (err, req, res) => {
  // console.error(err);
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // B) Rendered website
  return res.status(err.statusCode).render('error', {
    title: 'Error',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) Api
  if (req.originalUrl.startsWith('/api')) {
    // 1) 操作错误，by wrong request
    if (err.isOprational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // 2) 编程错误，无需返回具体细节
    console.error(`ERROR:`, err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error!!',
    });
  }

  // B) Rendered website
  if (err.isOprational) {
    // 1) 操作错误，by wrong request
    return res.status(err.statusCode).render('error', {
      title: 'Error',
      msg: err.message,
    });
  }
  // 2) 编程错误，无需返回具体细节
  console.error(`ERROR:`, err);
  return res.status(err.statusCode).render('error', {
    title: 'Error',
    msg: 'Internal server error.',
  });
};
module.exports = (err, req, res, next) => {
  //   console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = {
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
      isOprational: err.isOprational,
    };
    if (err.name === 'CastError') error = handleCastErroDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleExpireTokenJWT();

    sendErrorProd(error, req, res);
  }

  next();
};
