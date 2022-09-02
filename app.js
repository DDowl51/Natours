const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp'); // HTTP parameters polution
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

// 告诉express使用pug渲染前端
app.set('view engine', 'pug');
// path.join合并两个路径，无论结尾是否有/
app.set('views', path.join(__dirname, 'views'));

// 1 Middlewares

// 在该目录下查找静态文件
app.use(express.static(`${__dirname}/public`));

// set Security HTTP headers
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));

app.use((req, res, next) => {
  res.header('Cross-Origin-Embedder-Policy', 'cross-origin');
  next();
});

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Body parser, reading data from body into req.body, data size limited to 10kb
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// HTTP params polution (Clean up query string)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Limit request from same api
const limiter = rateLimit({
  // Options
  max: 100,
  windowMs: 30 * 60 * 1000, // 100(max) requests per ip in 30 minuts(windowMs)
  message: 'Too many requests from this IP, please try again in 30 minutes',
});

app.use('/api', limiter);

// app.use((req, res, next) => {
//   console.log('Hello from the middleware ❤️');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3 Routes
app.use('/', viewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// 未被上述router处理的请求，即未定义的url
app.all('*', (req, res, next) => {
  // 在next中传递参数会被默认认为是抛出错误
  // 此时会跳过其他所有中间件，来到错误处理中间件
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 定义一个四个参数的中间件函数，Express会自动将其识别为错误处理函数
app.use(globalErrorHandler);

module.exports = app;
