const express = require('express');
const authController = require('./../controllers/authController');
const productController = require('./../controllers/productController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();
// router.use('/:productId/reviews', reviewRouter);
