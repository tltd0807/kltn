const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const { OAuth2 } = google.auth;
const OAUTH_PLAYGROUND = 'https://developers.google.com/oauthplayground';

const oauth2Client = new OAuth2(
  process.env.MAILING_SERVICE_CLIENT_ID,
  process.env.MAILING_SERVICE_CLIENT_SERECT,
  process.env.MAILING_SERVICE_REFRESH_TOKEN,
  OAUTH_PLAYGROUND
);
oauth2Client.setCredentials({
  refresh_token: process.env.MAILING_SERVICE_REFRESH_TOKEN,
});

const payOrderEmailTemplate = (order) => {
  // console.log('payOrderEmailTemplate: ', order);
  let voucherDiscount = 0;
  if (order.voucher) voucherDiscount = order.voucher.discount;
  return `<h1>Thanks for shopping with us</h1>
  <p>
  Hi ${order.user.firstName}, </p>
  <p>We have finished processing your order.</p>
  <h2>[Order ${order._id}] (${order.createdAt.toString().substring(0, 10)})</h2>
  <table>
  <thead>
  <tr>
  <td><strong>Product</strong></td>
  <td><strong>Quantity</strong></td>
  <td><strong align="right">Price</strong></td>
  </thead>
  <tbody>
  ${order.orderItems
    .map(
      (item) => `
    <tr>
    <td>${item.product.name} ${item.product.customeId} ${item.product.gender} ${
        item.product.color
      }(size:${item.size})</td>
    <td align="center">${item.quantity}</td>
    <td align="right"> ${item.price.toLocaleString('vi', {
      style: 'currency',
      currency: 'VND',
    })}</td>
    </tr>
  `
    )
    .join('\n')}
  </tbody>
  <tfoot>
  <tr>
  <td colspan="2">Items Price:</td>
  <td align="right"> ${order.orderItems
    .reduce((sum, item) => (sum += item.price), 0)
    .toLocaleString('vi', { style: 'currency', currency: 'VND' })}</td>
  </tr>
  <tr>
  <td colspan="2">Shipping Price:</td>
  <td align="right"> ${order.shippingPrice.toLocaleString('vi', {
    style: 'currency',
    currency: 'VND',
  })}</td>
  </tr>
  <tr>
  <td colspan="2">Discount Price:</td>
  <td align="right">- ${voucherDiscount.toLocaleString('vi', {
    style: 'currency',
    currency: 'VND',
  })}</td>
  </tr>

  <tr>
  <td colspan="2"><strong>Total Price:</strong></td>
  <td align="right"> ${(
    order.orderItems.reduce((sum, item) => (sum += item.price), 0) +
    order.shippingPrice -
    voucherDiscount
  ).toLocaleString('vi', { style: 'currency', currency: 'VND' })}</td>
  </tr>
  <tr>
  <td colspan="2">Payment Method:</td>
  <td align="right">${order.paymentMethod}</td>
  </tr>
  </table>
  <h2>Shipping address</h2>
  <p>
  ${order.address.fullName},<br/>
  ${order.address.phoneNo},<br/>
  ${order.address.address}, ${order.address.ward},
  ${order.address.district}, ${order.address.city}.
  </p>
  <hr/>
  <p>
  Thanks for shopping with us.
  </p>
  `;
};

const sendEmail = async (options) => {
  // 1) Create a transporter
  const accessToken = await oauth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.SENDER_EMAIL_ADDRESS,
      clientId: process.env.MAILING_SERVICE_CLIENT_ID,
      clientSecret: process.env.MAILING_SERVICE_CLIENT_SERECT,
      refreshToken: process.env.MAILING_SERVICE_REFRESH_TOKEN,
      accessToken,
    },
  });
  // 2) Define the email options
  // check options.type
  const mailOptions =
    options.type === 'confirm'
      ? {
          from: process.env.EMAIL_USERNAME,
          to: options.email,
          subject: options.subject,
          html: payOrderEmailTemplate(options.order),
        }
      : {
          from: process.env.EMAIL_USERNAME,
          to: options.email,
          subject: options.subject,
          html: options.message,
          // html: payOrderEmailTemplate(options.order),
        };

  // 3) Actually send the email
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
      return;
    }
    transporter.close();
  });
};

module.exports = sendEmail;
