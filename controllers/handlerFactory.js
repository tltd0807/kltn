const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({ status: 'success', data: null });
  });
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
  });
exports.createOne = (Model) =>
  catchAsync(async (req, res) => {
    // if (req.body.category) console.log(req.body.category);

    const newDoc = await Model.create(req.body);

    res.status(201).json({
      message: 'success',
      data: {
        data: newDoc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const query = Model.findById(req.params.id);
    if (popOptions) query.populate(popOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to allow for nested GET reviews on product (hack)
    let filter = {};
    if (req.params.productId) filter = { product: req.params.productId };
    if (req.query.name) {
      const newSearch = { $regex: `\\b${req.query.name}\\b`, $options: 'i' };
      delete req.query.name;
      req.query.name = { ...newSearch };
    }
    if (req.query.gender) {
      const newSearch = { $eq: `${req.query.gender}` };
      delete req.query.gender;
      req.query.gender = { ...newSearch };
    }
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 10000;
    // execute query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const total = await Model.countDocuments();
    const docs = await features.query;

    const totalPage =
      total % limit === 0 ? total / limit : Math.round(total / limit + 0.5);
    // Send response
    res.status(200).json({
      status: 'success',
      requestAt: req.requestTime,
      result: docs.length,
      totalPage: totalPage,
      currentPage: page,
      data: { data: docs },
    });
  });
