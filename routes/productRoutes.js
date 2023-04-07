const express = require('express');
// const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();
router.use('/:productId/reviews', reviewRouter);
