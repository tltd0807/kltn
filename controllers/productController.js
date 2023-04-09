// getProductById nhớ populate reviews
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const AppError = require('./../utils/appError');
const Product = require('./../models/productModel');
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

exports.uploadProductImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 4 },
]);

exports.resizeProductImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  const productFolderName = `${req.body.name
    .trim()
    .toLowerCase()
    .replace(' ', '-')}-${req.body.color
    .toLowerCase()
    .trim()
    .replace(' ', '-')}`;
  // 1) cover image
  const dir =
    `public/img/products/${req.body.category}/${req.user.id}/${productFolderName}`.replace(
      ' ',
      '-'
    );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }, (err) => {
      if (err) throw err;
    });
  }
  req.body.imageCover = `product-${productFolderName}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(600, 600)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`${dir}/${req.body.imageCover}`);

  req.body.imageCover = `${req.protocol}://${req.get('host')}/img/products/${
    req.body.category
  }/${req.user.id}/${productFolderName.replace(' ', '-')}/${
    req.body.imageCover
  }`;

  // 2)images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `product-${productFolderName}-${i + 1}.jpeg`.replace(
        ' ',
        '-'
      );

      await sharp(file.buffer)
        .resize(300, 300)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`${dir}/${filename}`);

      req.body.images.push(
        `${req.protocol}://${req.get('host')}/img/products/${
          req.body.category
        }/${req.user.id}/${productFolderName.replace(' ', '-')}/${filename}`
      );
    })
  );

  next();
});
exports.getAllProducts = factory.getAll(Product);

exports.getProductById = factory.getOne(Product, { path: 'reviews' });

exports.createNewProduct = factory.createOne(Product);

exports.updateProduct = factory.updateOne(Product);

// DELETE thì chỉ set isShow=false thôi
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isShow: false },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!product) {
    return next(new AppError('No document found with that ID', 404));
  }
  res.status(201).json({ status: 'success' });
});
