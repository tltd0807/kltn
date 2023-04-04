const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

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
  const dir = `public/img/users/userId`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }, (err) => {
      if (err) throw err;
    });
  }
  //   req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  req.file.filename = `user-userId-${Date.now()}.jpeg`;
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
  if (req.file) filteredBody.photo = req.file.filename;
  //   const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
  //     new: true,
  //     runValidators: true,
  //   });
  const updateUser = await User.findByIdAndUpdate(req.params.id, filteredBody, {
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

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// change password k suwr dungj update vif nó k có save hay create nên nó k có chạy validator
