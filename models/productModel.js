const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const productSchema = mongoose.Schema({});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
