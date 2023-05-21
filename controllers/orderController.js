const factory = require('./handlerFactory');

const Order = require('./../models/orderModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const sendEmail = require('../utils/email');

exports.getAllOrders = catchAsync(async (req, res, next) => {
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
  const features = new APIFeatures(Order.find(filter).lean(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const total = await Order.countDocuments();
  const docs = await features.query;

  // eslint-disable-next-line arrow-body-style
  const newDocs = docs.map((order) => {
    return {
      ...order,
      // eslint-disable-next-line arrow-body-style
      orderItems: order.orderItems.map((item) => {
        return {
          ...item,
          product: {
            ...item.product,
            imageCover: `${req.protocol}://${req.get('host')}${
              item.product.imageCover
            }`,
          },
        };
      }),
    };
  });

  const totalPage =
    total % limit === 0 ? total / limit : Math.round(total / limit + 0.5);
  // Send response
  res.status(200).json({
    status: 'success',
    requestAt: req.requestTime,
    result: docs.length,
    totalPage: totalPage,
    currentPage: page,
    data: { data: newDocs },
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const query = Order.findById(req.params.id).lean();
  const order = await query;
  if (!order) {
    return next(new AppError('No document found with that ID', 404));
  }

  const newOrder = {
    ...order,
    // eslint-disable-next-line arrow-body-style
    orderItems: order.orderItems.map((item) => {
      return {
        ...item,
        product: {
          ...item.product,
          imageCover: `${req.protocol}://${req.get('host')}${
            item.product.imageCover
          }`,
        },
      };
    }),
  };

  res.status(200).json({ status: 'success', data: { data: newOrder } });
});
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
    Order.find({ user: req.user._id }).lean(),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const total = await Order.countDocuments();
  const orders = await features.query;
  // eslint-disable-next-line arrow-body-style
  const newDocs = orders.map((order) => {
    return {
      ...order,
      // eslint-disable-next-line arrow-body-style
      orderItems: order.orderItems.map((item) => {
        return {
          ...item,
          product: {
            ...item.product,
            imageCover: `${req.protocol}://${req.get('host')}${
              item.product.imageCover
            }`,
          },
        };
      }),
    };
  });
  const totalPage =
    total % limit === 0 ? total / limit : Math.round(total / limit + 0.5);

  // Send response
  res.status(200).json({
    status: 'success',
    requestAt: req.requestTime,
    result: orders.length,
    totalPage: totalPage,
    currentPage: page,
    data: { data: newDocs },
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
exports.createNewOrder = catchAsync(async (req, res) => {
  const newOrder = await Order.create(req.body);
  const order = await Order.findById(newOrder._id)
    .populate({
      path: 'orderItems.product',
      select: 'id name price discount color gender imageCover customeId',
    })
    .populate({
      path: 'user',
      select: 'email firstName',
    })
    .populate({
      path: 'voucher',
    });
  await sendEmail({
    order,
    type: 'confirm',
    email: req.user.email,
    subject: 'Cảm ơn bạn đã đặt hàng',
  });
  res.status(201).json({
    message: 'success',
    data: {
      data: order,
    },
  });
});
