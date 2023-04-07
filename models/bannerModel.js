const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    require: [true, 'banner must have a title'],
  },
  image: {
    type: String,
    require: [true, 'banner must have a image'],
  },
});

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
