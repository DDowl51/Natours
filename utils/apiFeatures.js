class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) filtering
    const queryObj = { ...this.queryString };

    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // console.log(this.queryString.sort);
      const sortBy = this.queryString.sort.replaceAll(',', ' ');
      // console.log(sortBy);
      this.query = this.query.sort(sortBy);
    } else this.query = this.query.sort('-createdAt');

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replaceAll(',', ' ');
      this.query = this.query.select(fields);
    } else this.query = this.query.select('-__v'); // '-'号排除‘__v’

    return this;
  }

  pagination() {
    const page = Number(this.queryString.page) || 1; // 第几页
    const limit = Number(this.queryString.limit) || 100; // 每页的数量
    const skip = limit * (page - 1);

    // skip(): 跳过前n个结果
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
