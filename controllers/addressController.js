const Address = require('./../models/addressModel');
const factory = require('./handlerFactory');

exports.setUserId = (req, res, next) => {
  // console.log(req.user);
  // {
  //   role: 'user',
  //   _id: 64255bd0b7548e63389bf818,
  //   name: 'abc',
  //   email: 'abc@gmail.com',
  //   __v: 0
  // }

  if (!req.body.user) req.body.user = req.user._id;
  next();
};
exports.getAllAddresss = factory.getAll(Address);
exports.createNewAddress = factory.createOne(Address);
exports.getAddress = factory.getOne(Address);
exports.deleteAddress = factory.deleteOne(Address);
exports.updateAddress = factory.updateOne(Address);
