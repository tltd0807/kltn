const nodemailer = require('nodemailer');

const payOrderEmailTemplate = (order) => {
  console.log('payOrderEmailTemplate: ', order);
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
  ${order.address.address},<br/>
  ${order.address.city},<br/>
  ${order.address.ward},<br/>
  ${order.address.district}<br/>
  </p>
  <hr/>
  <p>
  Thanks for shopping with us.
  </p>
  `;
};

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Define the email options
  // check options.type
  const mailOptions =
    options.type === 'confirm'
      ? {
          from: 'Test Mail <test@gmail.com>',
          to: options.email,
          subject: options.subject,
          html: payOrderEmailTemplate(options.order),
        }
      : {
          from: 'Test Mail <test@gmail.com>',
          to: options.email,
          subject: options.subject,
          html: options.message,
          // html: payOrderEmailTemplate(options.order),
        };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
