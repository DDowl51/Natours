class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    // 是否是操作错误而不是编程错误
    this.isOprational = true;

    // 不在追踪栈中显示此构造函数
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
