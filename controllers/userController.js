const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const User = require('./../models/userModel');

const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // cần tạo thư mục theo userId để lưu hình
  // xem xét xóa hình cũ sau khi cập nhật

  //   khi protect rồi thì có thể req.user.id
  const dir = `public/img/users/${req.user.id}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }, (err) => {
      if (err) throw err;
    });
  }
  req.file.filename = `user-${req.user.id}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password updates.Please use /change-password',
        400
      )
    );
  // 2) Update user document
  const filteredBody = filterObj(req.body, 'firstName', 'lastName', 'email');
  if (req.file)
    filteredBody.photo = `/img/users/${req.user.id}/${req.file.filename}`;
  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updateUser,
    },
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

exports.deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.params.id, { isLocked: true });
  res.status(204).json({
    status: 'success',
    data: {
      user: null,
    },
  });
});
exports.updateUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.params.id, { isLocked: false });
  res.status(204).json({
    status: 'success',
    data: {
      user: null,
    },
  });
});

exports.getUserByEmail = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).lean();
  if (!user) {
    return next(new AppError('No document found with that ID', 404));
  }
  res.status(200).json({ status: 'success', data: { data: user } });
});
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10000;
  // execute query
  const features = new APIFeatures(User.find().lean(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const total = await User.countDocuments();
  const docs = await features.query;

  // eslint-disable-next-line arrow-body-style
  const newDocs = docs.map((user) => {
    return {
      ...user,
      photo: `${req.protocol}://${req.get('host')}${user.photo}`,
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
exports.getUser = catchAsync(async (req, res, next) => {
  const query = User.findById(req.params.id).lean();
  const doc = await query;
  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }
  const newUser = {
    ...doc,
    photo: `${req.protocol}://${req.get('host')}${doc.photo}`,
  };
  res.status(200).json({ status: 'success', data: { data: newUser } });
});
// change password k suwr dungj update vif nó k có save hay create nên nó k có chạy validator

exports.createAllAdress = catchAsync(async (req, res, next) => {
  const { addresses, _id } = req.user;
  addresses.push(req.body);
  const updatedUser = await User.findByIdAndUpdate(
    { _id: _id },
    {
      addresses: addresses,
    }
  );
  res.status(201).json({ status: 'success', data: updatedUser });
});
exports.deleteAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;
  const { addresses, _id } = req.user;

  const updatedAdresses = addresses.filter(
    (address) => address._id.toString() !== addressId
  );
  const updatedUser = await User.findByIdAndUpdate(
    { _id: _id },
    {
      addresses: updatedAdresses,
    }
  );
  res.status(204).json({ status: 'success', data: updatedUser });
});

exports.updatedAdresses = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;
  const { addresses, _id } = req.user;
  const updatedAdresses = addresses.map((item) => {
    if (item._id.toString() === addressId) {
      item.fullName = req.body.fullName || item.fullName;
      item.address = req.body.address || item.address;
      item.phoneNo = req.body.phoneNo || item.phoneNo;
      item.city = req.body.city || item.city;
      item.district = req.body.district || item.district;
      item.ward = req.body.ward || item.ward;
    }
    return item;
  });
  const updatedUser = await User.findByIdAndUpdate(
    { _id: _id },
    {
      addresses: updatedAdresses,
    }
  );
  res.status(201).json({ status: 'success', data: updatedUser });
  next();
});
