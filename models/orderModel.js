const mongoose = require('mongoose');
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
        price: {
          type: Number,
          require: [true, 'orderItem must have a price'],
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
      require: true,
    },
    vouchers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Voucher',
      },
    ],
    orderStatus: {
      type: String,
      require: true,
      default: 'new',
      enum: ['new', 'processing', 'done'],
    },
    createAt: Date,
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
    address: {
      type: mongoose.Schema.ObjectId,
      ref: 'Address',
      required: [true, 'Order must have an address'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
