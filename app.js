const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');

const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
// 1 =)global middleware
// set security HTTP headers
// app.use(helmet());
// Development login
if (process.env.NODE_ENV === 'development') {
  // console.log(' hello nodeenv');
  app.use(morgan('dev'));
}
// limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// data sanitization angainst NoSQL query injection
app.use(mongoSanitize());

// data sanitization angainst XSS
app.use(xss());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// Routes
app.use('/api/v1/users', userRouter);

// when the request reach the line of code, it means no other route catch that request
app.all('*', (req, res, next) => {
  // when next() has argument it automatic know it will be error and next to the error handling middleware
  next(new AppError(`Cant't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
