const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!'],
      trim: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    createdAt: { type: Date, default: Date.now(), select: false },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have a user'],
    },
  },
  { toJSON: { virtual: true }, toObject: { virtual: true } }
);

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // console.log(tourId);
  // this -> Review model
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // else分支代表所有评论都被删除，即stats数组为空时，将数据重置回默认数据
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
  // console.log(stats);
};

// 创建一个tour与user结合的unique索引
// 目的是限制每个用户只能对一个tour进行一次评论
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.post('save', function () {
  // this -> current review document

  // Point to the model(Review)
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  // this -> current query
  // 从query中获取document的trick
  // 并且将其储存在this(query).reviewDocument中, 由此在post中间件中使用
  // 不使用.clone()方法会返回Query was already excuted错误
  this.reviewDocment = await this.clone().findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // 由于此时query已经被await/执行了，因此无法使用this.clone().findOne()
  // 所以需要在pre中间件中将document储存在this.reviewDocument中
  // 由此传递到post中间件中使用
  // 必须在post中间件中计算数据，因为只有当数据在数据库中更改了之后才能计算
  // 获取Model的方法也是使用document.constructor, 但是此时的document是this.reviewDocument
  // 因此合起来就是this.reviewDocument.constructor.calcAverageRatings(this.reviewDocument.tour)
  await this.reviewDocment.constructor.calcAverageRatings(
    this.reviewDocment.tour
  );
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
