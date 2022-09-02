const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  console.log('Unhandled exception!! Exiting...');

  process.exit(1);
});

dotenv.config({ path: './config.env' });
// 先定义环境变量，然后再在之后的app.js中使用
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
// Connect to database
mongoose.connect(DB).then(() => console.log('DB connection successful!'));

// 会自动创建一个复数形式的collections名字，基于model的名字(Tour => tours)

// console.log(process.env);
const port = process.env.PORT || 3000;
// Start a server
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`App running on ${port}...`);
});

// Handle all errors that are still unhandled globally
process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection!! Exiting...');

  // 在服务器关闭之后再退出进程
  server.close(() => {
    process.exit(1);
  });
});
