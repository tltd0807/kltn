const factory = require('./handlerFactory');

const Order = require('./../models/orderModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllOrders = factory.getAll(Order);
exports.createNewOrder = factory.createOne(Order);
exports.getOrder = factory.getOne(Order);
exports.getMe = (req, res, next) => {
  req.body.user = req.user._id;
  next();
};

// delete thif cho update thanh fail
// exports.deleteOrder = factory.deleteOne(Order);
exports.updateOrder = factory.updateOne(Order);

exports.getAllOrdersByUser = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10000;
  // execute query

  const features = new APIFeatures(
    Order.find({ user: req.user._id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const total = await Order.countDocuments();
  const order = await features.query;

  const totalPage =
    total % limit === 0 ? total / limit : Math.round(total / limit + 0.5);

  // Send response
  res.status(200).json({
    status: 'success',
    requestAt: req.requestTime,
    result: order.length,
    totalPage: totalPage,
    currentPage: page,
    data: { data: order },
  });
});

// restrictTo('admin')
exports.acceptOrder = catchAsync(async (req, res, next) => {
  req.body.orderStatus = 'processing';
  next();
});

exports.deleteOrder = catchAsync(async (req, res, next) => {
  const orderBeforUpdate = await Order.findById(req.params.id);
  if (
    orderBeforUpdate.orderStatus === 'fail' ||
    orderBeforUpdate.orderStatus === 'done'
  )
    return next(new AppError('Cannot update completed order', 400));

  if (req.user.role === 'user' && orderBeforUpdate.orderStatus !== 'new')
    return next(
      new AppError('User cannot delete order after it was processing', 400)
    );

  if (
    req.user.role === 'user' &&
    !(orderBeforUpdate.user.toString() === req.user._id.toString())
  ) {
    return next(
      new AppError('User does not have owned to cancel this order', 400)
    );
  }

  req.body.orderStatus = 'fail';
  next();
});

// restricTo('admin)
exports.completeOrder = catchAsync(async (req, res, next) => {
  const orderBeforUpdate = await Order.findById(req.params.id);
  if (
    orderBeforUpdate.orderStatus === 'fail' ||
    orderBeforUpdate.orderStatus === 'done'
  )
    return next(new AppError('Cannot update completed order', 400));
  if (
    orderBeforUpdate.paymentMethod !== 'COD' &&
    orderBeforUpdate.paymentResult.status === false
  )
    return next(new AppError('Please pay for the order through Paypal', 400));
  req.body.paymentResult = {
    status: true,
    updateTime: new Date(Date.now()),
  };

  req.body.orderStatus = 'done';
  next();
});
