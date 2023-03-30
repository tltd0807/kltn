const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();

// 1 =)global middleware
// set security HTTP headers
app.use(helmet());
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

module.exports = app;
