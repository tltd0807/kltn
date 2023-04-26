// const AppError = require('./../utils/appError');
// const Product = require('./../models/productModel');
// const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

const Order = require('./../models/orderModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllOrders = factory.getAll(Order);
exports.createNewOrder = factory.createOne(Order);
exports.getOrder = factory.getOne(Order);
exports.getMe = (req, res, next) => {
  req.body.user = req.user._id;
  next();
};
// delete thif cho update thanh fail
// exports.deleteOrder = factory.deleteOne(Order);
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const orderBeforUpdate = await Order.findById(req.params.id);

  if (
    orderBeforUpdate.orderStatus === 'fail' ||
    orderBeforUpdate.orderStatus === 'done'
  ) {
    return next(
      new AppError('Order had already fail/done please create new one', 400)
    );
  }
  if (
    req.user.role === 'user' &&
    orderBeforUpdate.orderStatus !== 'new' &&
    req.body.orderStatus === 'fail'
  ) {
    return next(
      new AppError(
        "User can't update order to fail if order status different from new",
        400
      )
    );
  }
  if (
    req.user.role === 'user' &&
    (req.body.orderStatus === 'done' || req.body.orderStatus === 'processing')
  ) {
    return next(
      new AppError("User can't update order to done or processing", 400)
    );
  }
  if (
    orderBeforUpdate.paymentResult.status === false &&
    req.body.orderStatus === 'done'
  ) {
    return next(
      new AppError('Please pay for the order before update status to done', 400)
    );
  }

  if (
    orderBeforUpdate.orderStatus === 'processing' &&
    req.body.orderStatus === 'new'
  ) {
    return next(new AppError('You cannot update order status to new', 400));
  }
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    //   ['new', 'processing', 'done', 'fail'],
    { orderStatus: req.body.orderStatus },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!order) {
    return next(new AppError('No orderument found with that ID', 404));
  }

  //   thêm ở đây nếu update với orderstatus ===fail thì cập nhật lại stock

  res.status(200).json({ status: 'success', data: { data: order } });
});
