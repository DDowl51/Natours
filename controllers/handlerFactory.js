const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndRemove(req.params.id);

    if (!doc)
      return next(
        new AppError(`No document found with that ID(${req.params.id})`, 404)
      );

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }); // new: 返回更新的文件

    if (!doc)
      return next(
        new AppError(`No document found with that ID(${req.params.id})`, 404)
      );

    res.status(200).json({
      status: 'success',
      data: { data: doc },
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: { data: doc },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc)
      return next(
        new AppError(`No document found with that ID(${req.params.id})`, 404)
      );

    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.getAll = (Model, pattern) =>
  catchAsync(async (req, res, next) => {
    // console.log(pattern);
    // To allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // // For getAll(Booking): 如果当前有用户登陆，则只返回特定用户的所有Booking
    // if (req.user) filter = { user: req.user.id };
    let modelQuery = Model.find(filter);

    // 特定字符串搜索
    if (pattern) {
      modelQuery = modelQuery.regex('name', pattern);
    }

    // Execute query
    const features = new APIFeatures(modelQuery, req.query)
      .filter()
      .sort()
      .limitFields()
      .pagination();
    const docs = await features.query;

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: { data: docs },
    });
  });
