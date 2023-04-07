const mongoose = require('mongoose');

const addressSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user'],
  },
  fullName: {
    type: String,
    required: [true, 'Please provide your fullname'],
  },
  address: {
    type: String,
    required: [true, 'Please provide your address'],
  },
  phoneNo: {
    type: String,
    required: [true, 'Please provide your phone number'],
  },
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
