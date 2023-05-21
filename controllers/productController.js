// getProductById nhớ populate reviews
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const AppError = require('./../utils/appError');
const Product = require('./../models/productModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
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

exports.uploadProductImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 4 },
]);

exports.resizeProductImages = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.imageCover || !req.files.images) return next();

  // console.log('req.body.name: ', req.body.name);
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

  // req.body.imageCover = `${req.protocol}://${req.get('host')}/img/products/${
  //   req.body.category
  // }/${req.user.id}/${productFolderName.replaceAll(' ', '-')}/${
  //   req.body.imageCover
  // }`;
  req.body.imageCover = `/img/products/${req.body.category}/${
    req.user.id
  }/${productFolderName.replaceAll(' ', '-')}/${req.body.imageCover}`;
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
        `/img/products/${req.body.category}/${
          req.user.id
        }/${productFolderName.replaceAll(' ', '-')}/${filename}`
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

  if (typeof req.body.inventory === 'string') {
    req.body.inventory = JSON.parse(req.body.inventory);
  }
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
  // console.log(req.body);
  return next();
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  // to allow for nested GET reviews on product (hack)
  let filter = {};
  let countFilter = {};

  if (req.params.productId) filter = { product: req.params.productId };
  if (req.query.name) {
    // const newSearch = { $regex: `\\b${req.query.name}\\b`, $options: 'i' };
    const newSearch = { $regex: req.query.name, $options: 'si' };
    delete req.query.name;
    // req.query.name = { ...newSearch };
    filter = {
      $or: [{ name: { ...newSearch } }, { customeId: { ...newSearch } }],
    };
    countFilter = {
      ...countFilter,
      $or: [{ name: { ...newSearch } }, { customeId: { ...newSearch } }],
    };
  }
  if (req.query.gender) {
    const newSearch = { $eq: `${req.query.gender}` };
    delete req.query.gender;
    req.query.gender = { ...newSearch };
  }
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10000;
  // execute query
  const features = new APIFeatures(Product.find(filter).lean(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  if (req.query.category) countFilter = { category: req.query.category };
  if (req.query.gender) countFilter.gender = req.query.gender;
  if (req.query.discount)
    countFilter = {
      ...countFilter,
      discount: { $gt: req.query.discount.gt - 0 },
    };
  const total = await Product.countDocuments(countFilter);
  const docs = await features.query;

  // eslint-disable-next-line arrow-body-style
  const newDocs = docs.map((product) => {
    return {
      ...product,
      imageCover: `${req.protocol}://${req.get('host')}${product.imageCover}`,
      images: [...product.images].map(
        (image) => `${req.protocol}://${req.get('host')}${image}`
      ),
    };
  });
  const totalPage =
    total % limit === 0 ? total / limit : Math.round(total / limit + 0.5);
  // console.log(total);
  // Send response
  res.status(200).json({
    status: 'success',
    requestAt: req.requestTime,
    result: docs.length,
    totalPage: totalPage,
    currentPage: page,
    data: {
      data: newDocs,
    },
  });
});
// exports.getProductById = factory.getOne(Product, );
exports.getProductById = catchAsync(async (req, res, next) => {
  const query = Product.findById(req.params.id)
    .lean()
    .populate({ path: 'reviews' });
  const product = await query;
  // eslint-disable-next-line arrow-body-style

  if (!product) {
    return next(new AppError('No document found with that ID', 404));
  }
  const newDocs = {
    ...product,
    imageCover: `${req.protocol}://${req.get('host')}${product.imageCover}`,
    images: [...product.images].map(
      (image) => `${req.protocol}://${req.get('host')}${image}`
    ),
    // eslint-disable-next-line arrow-body-style
    reviews: product.reviews.map((review) => {
      return {
        ...review,
        user: {
          ...review.user,
          photo: `${req.protocol}://${req.get('host')}${review.user.photo}`,
        },
      };
    }),
  };
  res.status(200).json({ status: 'success', data: { data: newDocs } });
});
