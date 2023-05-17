const mongoose = require('mongoose');

const Product = require('./../models/productModel');
const Voucher = require('./../models/voucherModel');
const AppError = require('../utils/appError');

// còn thiếu chỗ shippingAddress
const orderSchema = new mongoose.Schema(
  {
    orderItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: 'Product',
          required: [true, 'orderItem must belong to a product.'],
        },
        // Price lấy ở productPrice lúc tạo để lưu riêng nên k cần viết middle lấy từ product
        price: {
          type: Number,
          require: [true, 'orderItem must have a price'],
        },
        size: {
          type: String,
          require: [true, 'orderItem must have a size'],
        },
        quantity: {
          type: Number,
          require: [true, 'orderItem must have a quantity'],
          default: 1,
        },
      },
    ],
    totalPrice: {
      type: Number,
    },
    voucher: {
      type: mongoose.Schema.ObjectId,
      ref: 'Voucher',
    },
    orderStatus: {
      type: String,
      require: true,
      default: 'new',
      enum: ['new', 'processing', 'done', 'fail'],
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    doneAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      default: 'COD',
      enum: ['COD', 'PayPal'],
    },
    paymentResult: {
      status: {
        type: Boolean,
        default: false,
      },
      updateTime: Date,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
    },
    // Không ref mà lấy data từ user r lưu lại lúc create luôn
    address: {
      fullName: {
        type: String,
        require: [true, 'Please provide name'],
      },
      phoneNo: {
        type: String,
        require: [true, 'Please provide phone number'],
      },
      address: {
        type: String,
        require: [true, 'Please provide phone number'],
      },
      city: {
        type: String,
        require: [true, 'Please provide city'],
      },
      district: {
        type: String,
        require: [true, 'Please provide district'],
      },
      ward: {
        type: String,
        require: [true, 'Please provide ward'],
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'orderItems.product',
    select: 'id name price discount color gender imageCover customeId',
  })
    .populate({
      path: 'user',
      select: '-addresses',
    })
    .populate({
      path: 'voucher',
    });

  next();
});

orderSchema.pre('findOneAndUpdate', async function (next) {
  const updateData = this.getUpdate();
  // console.log(updateData);
  if (updateData.orderStatus === 'fail') {
    const orderToUpdate = await this.model.findOne(this.getQuery());
    // console.log(orderToUpdate);

    const items = [];
    orderToUpdate.orderItems.forEach(async (orderItem) => {
      items.push(Product.findById(orderItem.product));
    });
    const products = await Promise.all(items);
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderToUpdate.orderItems) {
      // eslint-disable-next-line no-await-in-loop
      const { inventory: productInventory } = await Product.findById(
        orderItem.product
      );

      const product = products.find(
        (item) => item._id.toString() === orderItem.product._id.toString()
      );
      // console.log(orderItem.product.toString());
      const iventoryOfSize = product.inventory.find(
        (item) => item.size === orderItem.size
      );
      iventoryOfSize.stock += orderItem.quantity;
      iventoryOfSize.soldAmount -= orderItem.quantity;

      const newInventory = productInventory.map((item) => {
        if (item.size === iventoryOfSize.size) {
          item.stock = iventoryOfSize.stock;
          item.soldAmount = iventoryOfSize.soldAmount;
        }
        return item;
      });

      // eslint-disable-next-line no-await-in-loop
      await Product.findOneAndUpdate(
        { _id: orderItem.product },
        { inventory: [...newInventory] },
        {
          new: true,
        }
      );
    }
  }
  next();
});

// Calculate totalPrice
orderSchema.pre('save', async function (next) {
  let voucherNumber = 0;
  if (this.voucher) {
    const today = new Date(Date.now());
    const appliedVoucher = await Voucher.findById(this.voucher);
    if (appliedVoucher.expireDate < today)
      return next(new AppError('Voucher is expired', 400));

    if (appliedVoucher.startDate > today)
      return next(new AppError('Voucher is not avaiable yet', 400));

    voucherNumber = appliedVoucher.discount;
  }

  /*eslint no-return-assign: "error"*/
  this.totalPrice =
    this.orderItems.reduce(
      (total, item) => (total += item.price * item.quantity),
      0
    ) - voucherNumber;
  next();
});

orderSchema.pre('save', async function (next) {
  // send mail to user that order  belong to (userId in order)
  let enoughStock = true;
  const items = [];
  this.orderItems.forEach(async (orderItem) => {
    items.push(Product.findById(orderItem.product));
  });
  const products = await Promise.all(items);
  // console.log(products);

  // 1 check stock is enough
  this.orderItems.forEach((orderItem) => {
    const product = products.find(
      // trước khi save nên  orderItem.product chưa có populate
      (item) => item._id.toString() === orderItem.product.toString()
    );
    const iventoryOfSize = product.inventory.find(
      (item) => item.size === orderItem.size
    );
    // console.log(iventoryOfSize);
    if (iventoryOfSize.stock < orderItem.quantity) {
      enoughStock = false;
      return next(new AppError('Stock is not enough to create Order', 400));
    }
  });
  // https://stackoverflow.com/questions/66436674/mongodb-updating-the-document-fails-in-a-foreach-loop
  // 2 update stock and soldAmount
  if (enoughStock) {
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of this.orderItems) {
      // this.orderItems.forEach(async (orderItem) => {
      // eslint-disable-next-line no-await-in-loop
      const { inventory: productInventory } = await Product.findById(
        orderItem.product
      );

      const product = products.find(
        (item) => item._id.toString() === orderItem.product.toString()
      );
      const iventoryOfSize = product.inventory.find(
        (item) => item.size === orderItem.size
      );
      iventoryOfSize.stock -= orderItem.quantity;
      iventoryOfSize.soldAmount += orderItem.quantity;

      // console.log('========================');
      // console.log('iventoryOfSize: ', iventoryOfSize);
      // console.log('productInventory: ', productInventory[0], productInventory[1]);
      const newInventory = productInventory.map((item) => {
        if (item.size === iventoryOfSize.size) {
          item.stock = iventoryOfSize.stock;
          item.soldAmount = iventoryOfSize.soldAmount;
        }
        return item;
      });
      // console.log('newInventory: ', newInventory[0], newInventory[1]);
      // eslint-disable-next-line no-await-in-loop
      await Product.findOneAndUpdate(
        { _id: orderItem.product },
        { inventory: [...newInventory] },
        {
          new: true,
        }
      );
      // });
    }
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
