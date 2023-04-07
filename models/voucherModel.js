const mongoose = require('mongoose');

const voucherShema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, 'Voucher must have a name'],
  },
  startDate: Date,
  expireDate: Date,
  discount: {
    type: Number,
    default: 0,
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    default: 'percent',
    enum: ['percent', 'number'],
  },
});

const Voucher = mongoose.Model('Voucher', voucherShema);

module.exports = Voucher;
