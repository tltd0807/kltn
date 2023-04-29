const mongoose = require('mongoose');

const Product = require('./../models/productModel');
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
        // Lưu lại discount cũ
        discount: {
          // add validator ở đây kiểm tra 0-90%
          type: Number,
          default: 0,
          validate: {
            // Just work on CREATE and SAVE
            validator: function (val) {
              return val >= 0 && val <= 90;
            },
            message: 'discount percent must be between 0 and 90',
          },
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

    createdAt: {
      type: Date,
      default: Date.now(),
    },
    paymentMethod: {
      type: String,
      default: 'COD',
      enum: ['COD', 'Paypal'],
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
      phoneNo: {
        type: String,
        require: true,
      },
      addresDetail: {
        type: String,
        require: true,
      },
      fullName: {
        type: String,
        require: true,
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
    path: 'product',
    select:
      'id name price discount color gender imageCover inventory customeId',
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
        (item) => item._id.toString() === orderItem.product.toString()
      );
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
orderSchema.pre('save', function (next) {
  /*eslint no-return-assign: "error"*/
  this.totalPrice = this.orderItems.reduce(
    (total, item) => (total += item.price * item.quantity),
    0
  );
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
