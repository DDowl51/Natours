const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email!'],
    //
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide your password'],
    minlength: [8, 'At least 8 characters for password'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    // 只在创建文档时有用(.save()/.create())，更新时不起作用
    validate: {
      validator: function (el) {
        return this.password === el;
      },
      message: 'Password are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  confirmed: {
    type: Boolean,
    default: false,
    select: false,
  },
  confirmToken: String,
});

// 查询之前排除所有active=false的用户，即“注销”用户，所有find操作都找不到active=false的用户
userSchema.pre(/^find/, function (next) {
  // this指向当前的query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', async function (next) {
  // 只有在密码字段被更改的时候才运行此函数
  if (!this.isModified('password')) return next();
  // 加密password字段, 12是加密强度
  this.password = await bcrypt.hash(this.password, 12);
  // 删除passwordConfirm字段

  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  // 只有在密码字段被更改的时候才运行此函数
  if (!this.isModified('password') || this.isNew) return next();

  // 防止token比passwordChangedAt先创建
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async (candidatePassword, userPassword) =>
  await bcrypt.compare(candidatePassword, userPassword);

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // +10min

  // console.log({ resetToken }, this.passwordResetToken);

  return resetToken;
};

userSchema.methods.createConfirmToken = function () {
  const confirmToken = crypto.randomBytes(32).toString('hex');

  this.confirmToken = crypto
    .createHash('sha256')
    .update(confirmToken)
    .digest('hex');

  return confirmToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
