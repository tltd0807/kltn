const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    cartItems: [
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
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
