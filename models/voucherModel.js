const mongoose = require('mongoose');

const voucherShema = mongoose.Schema({
  name: {
    type: String,
    require: [true, 'Voucher must have a name'],
    unique: true,
  },
  startDate: Date,
  expireDate: Date,
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
});
// voucherShema.pre(/^find/, function (next) {
//   // tourSchema.pre('find', function (next) {
//   // "this" refer to the query object
//   this.find({
//     startDate: {
//       $gte: Date.now(),
//     },
//     expireDate: {
//       $lte: Date.now(),
//     },
//   });
//   this.startDate = Date.now();

//   next();
// });

const Voucher = mongoose.model('Voucher', voucherShema);

module.exports = Voucher;
