// const AppError = require('./../utils/appError');
const Category = require('./../models/categoryModel');
// const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getAllCategorys = factory.getAll(Category);

exports.getCategoryById = factory.getOne(Category, {
  path: 'products',
  select: 'name price discount color _id imageCover',
});

exports.createNewCategory = factory.createOne(Category);
exports.updateCategory = factory.updateOne(Category);
