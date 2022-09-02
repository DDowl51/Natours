const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name!'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'A tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must havea duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // 每次更新ratingsAverage时执行
      set: val => Math.round(val * 100) / 100,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price!'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value) {
          // 只在创建文档时有用，更新时不起作用
          return value < this.price;
        },
        message: 'Discount price({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true, // 移除开头和结尾的所有空白
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], // 字符串数组Schema
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // 默认在query中不被选择
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // 内置对象
    startLocation: {
      // Geo JSON
      // 地点对象
      type: {
        type: String,
        default: 'Point',
        // 限制类型只能为点类型
        enum: ['Point'],
      },
      // 坐标对象是数组，[经度, 纬度]
      coordinates: [Number],
      address: String,
      description: String,
    },
    // 地点对象数组
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // 引用
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// 创建索引, 加快query的速度
tourSchema.index({
  // 按照升序排序排列price
  price: 1,
  ratingsAverage: -1,
});

tourSchema.index({ slug: 1 });

// 此处的索引为二维球体
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  // Review中的"foreignField"对应Tour中的"localField"
  // 即Review中的"tour"是Tour中的"_id"
  foreignField: 'tour',
  localField: '_id',
});

// 文档中间件，在保存操作之前执行(.save(), .create())
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });

  next();
});

// Embedding document, 不能及时更新用户文档
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.post('save', (doc, next) => {
//   console.log(doc);
//   next();
// });

// Query middleware
// 在find操作consume之前
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (doc, next) {
  console.log(`Query took: ${Date.now() - this.start}ms`);
  // console.log(doc);

  next();
});

// aggregate middleware
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.dir(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
