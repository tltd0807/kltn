const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, 'Category must have a name'],
    },
    slug: String,
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
categorySchema.pre('save', function (next) {
  // this prefer to the current processing document
  this.slug = slugify(this.name, { lower: true });
  next();
});
// virtual populate
categorySchema.virtual('products', {
  ref: 'Product',
  foreignField: 'tour',
  localField: '_id',
});
const Category = mongoose.model('Product', categorySchema);

module.exports = Category;
