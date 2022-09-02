const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

dotenv.config({ path: '../../config.env' });
// 先定义环境变量，然后再在之后的app.js中使用

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
// const DB =
//   'mongodb+srv://ddowl:aF-4jj7GeZZdj7f@cluster0.jrhhu3f.mongodb.net/natours?retryWrites=true&w=majority';
// Connect to database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));

// 会自动创建一个复数形式的collections名字，基于model的名字(Tour => tours)

const tours = JSON.parse(fs.readFileSync('tours.json', 'utf-8'));
const users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
const reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf-8'));

// import data to database
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data imported');
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

// delete all data from collections
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data deleted');
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

// console.log(process.argv);

const option = process.argv[2];
if (option === '--import') importData();
if (option === '--delete') deleteData();
