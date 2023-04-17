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
  if (!req.files || !req.files.imageCover || !req.files.images) return next();
  const productFolderName = `${req.body.name
    .trim()
    .toLowerCase()
    .replaceAll(' ', '-')}-${req.body.color
    .toLowerCase()
    .trim()
    .replaceAll(' ', '-')}`;

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
  req.body.imageCover = `product-${productFolderName}-cover.jpeg`.replace(
    ' ',
    '-'
  );
  await sharp(req.files.imageCover[0].buffer)
    .resize(1200, 1200)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`${dir}/${req.body.imageCover}`);

  req.body.imageCover = `${req.protocol}://${req.get('host')}/img/products/${
    req.body.category
  }/${req.user.id}/${productFolderName.replaceAll(' ', '-')}/${
    req.body.imageCover
  }`;

  // 2)images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `product-${productFolderName}-${i + 1}.jpeg`.replaceAll(
        ' ',
        '-'
      );

      await sharp(file.buffer)
        .resize(1200, 1200)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`${dir}/${filename}`);

      req.body.images.push(
        `${req.protocol}://${req.get('host')}/img/products/${
          req.body.category
        }/${req.user.id}/${productFolderName.replaceAll(' ', '-')}/${filename}`
      );
    })
  );

  next();
});
exports.checkId = catchAsync(async (req, res, next) => {
  const product = await Product.find({ customeId: req.body.customeId });
  if (product.length === 0) {
    if (typeof req.body.inventory === 'string') {
      req.body.inventory = JSON.parse(req.body.inventory);
    }
    return next();
  }

  return next(new AppError('Mã sản phẩm đã tồn tại', 400));
});

exports.createNewProduct = factory.createOne(Product);

exports.getAllProducts = factory.getAll(Product);

exports.getProductById = factory.getOne(Product, { path: 'reviews' });

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
/*eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }]*/
exports.updateProductInventory = catchAsync(async (req, res, next) => {
  if (!req.body.inventory) return next();

  const { inventory: productInventory } = await Product.findById(req.params.id);

  const newInventory = productInventory.map((item) => {
    for (let i = 0; i < req.body.inventory.length; i++) {
      if (item.size === req.body.inventory[i].size) {
        item.stock = req.body.inventory[i].stock;
      }
    }
    return item;
  });
  req.body.inventory = [...newInventory];

  return next();
});
