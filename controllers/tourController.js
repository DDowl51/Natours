const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
// const filepath = `${__dirname}/../dev-data/data/tours-simple.json`;
// const tours = JSON.parse(fs.readFileSync(filepath));

// Store photo to memory instead of disk as above, required at req.file.buffer
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Not an image! Please upload only images.', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.updateTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image

  // 更改document中的cover值
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];
  await Promise.all(
    // 使用forEach会在async callback函数返回之前执行next()
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price,-ratingsAverage';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // const id = Number(req.params.id);
//   // tours.find(tour => tour.id === id);

//   const tour = await Tour.findByIdAndRemove(req.params.id);

//   if (!tour)
//     return next(
//       new AppError(`No tour found with that ID(${req.params.id})`, 404)
//     );

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4.5 } } },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },

        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $sort: { avgPrice: 1 } },
    // { $match: { _id: { $ne: 'EASY' } } },
  ]);
  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = Number(req.params.year);
  const plan = await Tour.aggregate([
    { $unwind: '$startDates' }, // 将文档中的数组分开，每个数组创建一个对应的文档(数据)
    // 查找出符合条件的文档
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // 将结果根据_id中的对象分组
    {
      $group: {
        // $month: 提取日期中的月份
        _id: { $month: '$startDates' },
        // $sum求和, 每次加(1)
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }, // 将名字添加进tours数组
      },
    },
    // 增加一个字段: _id, 即$group中的_id, 此时为月份
    { $addFields: { month: '$_id' } }, // 增加一个字段
    // 控制返回结果中显示的字段
    { $project: { _id: 0 } }, // 取消显示_id字段
    // 对结果排序
    { $sort: { numTourStarts: -1 } },
    // { $limit: 1 },
  ]);
  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

// '/tours-within/:distance/center/:latlng/unit/:unit'
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // 弧度=距离/半径
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!(lat && lng))
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );

  // console.log(distance, lat, lng, unit);

  const tours = await Tour.find({
    // 需要为startLocation添加一个索引
    startLocation: {
      // 地理位置查询
      $geoWithin: {
        // 以圆为中心, lng, lat(经度在前纬度在后！)为中心点, radius为弧度
        $centerSphere: [[lng, lat], radius],
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { data: tours },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!(lat && lng))
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );

  const distances = await Tour.aggregate([
    // 必须要是aggregate的第一个, See: tourModel.js:187, aggregate中间件
    // 并且document中必须要有一个地理位置的索引(2dsphere)
    {
      $geoNear: {
        // key:   如果有多个索引，使用key指定需要使用的索引
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
        // 创建距离计算结果并储存的字段, 单位: 米
        distanceField: 'distance',
        // 将距离乘(0.001)
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: { distance: 1, name: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { data: distances },
  });
});

exports.searchTour = catchAsync(async (req, res, next) => {
  const search = req.query.search.replaceAll('+', ' ');

  // Execute query
  // const features = new APIFeatures(modelQuery, req.query)
  //   .filter()
  //   .sort()
  //   .limitFields()
  //   .pagination();
  // const docs = await features.query;
  console.log(search);

  // 特定字符串搜索
  const docs = await Tour.find({
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

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { data: docs },
  });
});
