const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, 'Product must have a name'],
    },
    customeId: {
      type: String,
      unique: true,
      require: true,
      uppercase: true,
    },
    description: {
      type: String,
      default:
        'Do màn hình và điều kiện ánh sáng khác nhau, màu sắc thực tế của sản phẩm có thể chênh lệch khoảng 3-5%',
    },
    price: {
      type: Number,
      require: [true, 'Product must have a price'],
    },
    discount: {
      // add validator ở đây kiểm tra 0-90%
      type: Number,
      default: 0,
      validate: {
        // Just work on CREATE and SAVE
        validator: function (val) {
          return val >= 0 && val <= 90;
        },
        message: 'discount percent must be between 0 and 90',
      },
    },
    color: {
      type: String,
      require: [true, 'Product must have a color'],
    },
    inventory: [
      {
        size: {
          type: String,
          require: [true, 'Product must have a size'],
        },
        stock: {
          type: Number,
          default: 0,
          min: [0, 'Stock must be above 0'],
        },
        soldAmount: {
          type: Number,
          default: 0,
          min: [0, 'soldAmount must be above 0'],
        },
      },
    ],

    imageCover: {
      type: String,
      required: [true, 'a product must have a cover image'],
    },
    images: [String],
    gender: {
      type: String,
      enum: ['unisex', 'male', 'female'],
      default: 'unisex',
    },
    isShow: {
      type: Boolean,
      default: true,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      required: [true, 'Product must belong to a category.'],
    },
    slug: String,
    averageRate: {
      type: Number,
      default: 1,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    numberOfReview: {
      type: Number,
      default: 0,
    },
    createAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
productSchema.index({ price: 1, averageRate: -1 });

// virtual populate
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
});

productSchema.pre('save', function (next) {
  // this prefer to the current processing document
  this.slug = slugify(this.name, { lower: true });
  // If it just 1 middleware then you can ignore next() but just use it because it is the best practice
  next();
});
productSchema.pre('save', function (next) {
  // this prefer to the current processing document
  if (this.description === '')
    this.description =
      'Do màn hình và điều kiện ánh sáng khác nhau, màu sắc thực tế của sản phẩm có thể chênh lệch khoảng 3-5%';
  // If it just 1 middleware then you can ignore next() but just use it because it is the best practice
  next();
});

productSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'category',
    select: 'id name',
  });

  next();
});

productSchema.pre(/^find/, function (next) {
  // tourSchema.pre('find', function (next) {
  // "this" refer to the query object
  this.find({ isShow: { $ne: false } });
  this.start = Date.now();

  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
