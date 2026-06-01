const { sendEmail } = require('../config/nodemailer');

/**
 * Email HTML wrapper template
 */
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PizzaHub</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #FF6B35 0%, #F7C948 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px; }
    .body { padding: 35px 40px; }
    .footer { background: #f8f8f8; padding: 20px 40px; text-align: center; border-top: 1px solid #eee; }
    .footer p { color: #999; font-size: 12px; margin: 5px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FF6B35, #F7C948); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin: 20px 0; }
    .otp-box { background: linear-gradient(135deg, #FF6B35, #F7C948); color: #fff; text-align: center; border-radius: 12px; padding: 20px; margin: 25px 0; }
    .otp-code { font-size: 42px; font-weight: 900; letter-spacing: 10px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table th { background: #f5f5f5; padding: 12px; text-align: left; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    table td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; }
    .total-row td { font-weight: 700; font-size: 16px; color: #FF6B35; border-bottom: none; }
    h2 { color: #333; font-size: 22px; margin-top: 0; }
    p { color: #555; line-height: 1.7; font-size: 15px; }
    .alert { background: #fff3cd; border-left: 4px solid #F7C948; padding: 15px 20px; border-radius: 6px; margin: 20px 0; }
    .success-icon { font-size: 48px; text-align: center; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍕 PizzaHub</h1>
      <p>Delicious Pizzas, Delivered Fast</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PizzaHub. All rights reserved.</p>
      <p>You're receiving this email because you registered with PizzaHub.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send OTP email for verification or password reset
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {'verify'|'reset'} type - OTP purpose
 */
const sendOTPEmail = async (email, otp, type) => {
  const isVerify = type === 'verify';
  const subject = isVerify ? '🍕 PizzaHub - Verify Your Email' : '🔐 PizzaHub - Reset Your Password';

  const content = `
    <div class="success-icon">${isVerify ? '📧' : '🔐'}</div>
    <h2>${isVerify ? 'Verify Your Email Address' : 'Reset Your Password'}</h2>
    <p>Hi there,</p>
    <p>${
      isVerify
        ? "Welcome to PizzaHub! Please verify your email address to start ordering delicious pizzas."
        : "We received a request to reset your PizzaHub account password. Use the OTP below to reset it."
    }</p>
    <div class="otp-box">
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:14px;">Your One-Time Password</p>
      <div class="otp-code">${otp}</div>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">⏱ Valid for 10 minutes</p>
    </div>
    <div class="alert">
      <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. PizzaHub will never ask for your OTP.
    </div>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>Bon appétit! 🍕<br><strong>The PizzaHub Team</strong></p>
  `;

  await sendEmail(email, subject, emailWrapper(content));
};

/**
 * Send order confirmation email
 * @param {string} email - Customer email
 * @param {Object} order - Order object
 */
const sendOrderConfirmation = async (email, order) => {
  const subject = `🍕 PizzaHub - Order Confirmed! #${order.orderNumber}`;

  const itemsRows = order.items
    .map(
      (item) => `
    <tr>
      <td>${item.name} (${item.size})</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const deliveryTime = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '30-45 minutes';

  const content = `
    <div class="success-icon">✅</div>
    <h2>Your Order is Confirmed!</h2>
    <p>Hi there! We've received your order and our kitchen is already getting to work. 🔥</p>
    
    <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#888;">ORDER NUMBER</p>
      <p style="margin:5px 0 0;font-size:22px;font-weight:800;color:#FF6B35;">#${order.orderNumber}</p>
      <p style="margin:10px 0 0;font-size:13px;color:#888;">Estimated Delivery: <strong style="color:#333">${deliveryTime}</strong></p>
    </div>

    <h3 style="color:#333;">Order Summary</h3>
    <table>
      <thead>
        <tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr><td colspan="3" style="border-bottom:2px solid #eee;padding:5px 0;"></td></tr>
        <tr><td>Subtotal</td><td></td><td style="text-align:right">₹${order.totalAmount.toFixed(2)}</td></tr>
        ${order.discountAmount > 0 ? `<tr><td>Discount (${order.couponCode})</td><td></td><td style="text-align:right;color:#2ecc71">-₹${order.discountAmount.toFixed(2)}</td></tr>` : ''}
        <tr><td>Delivery Fee</td><td></td><td style="text-align:right">₹${order.deliveryFee.toFixed(2)}</td></tr>
      </tbody>
      <tfoot>
        <tr class="total-row"><td>Total Paid</td><td></td><td style="text-align:right">₹${order.finalAmount.toFixed(2)}</td></tr>
      </tfoot>
    </table>

    <h3 style="color:#333;">Delivery Address</h3>
    <p style="background:#f9f9f9;padding:15px;border-radius:8px;">
      📍 ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}<br>
      📞 ${order.deliveryAddress.phone}
    </p>
    <p>We'll send you updates as your order progresses. Stay hungry! 🍕</p>
  `;

  await sendEmail(email, subject, emailWrapper(content));
};

/**
 * Send order status update email
 * @param {string} email - Customer email
 * @param {string} orderNumber - Order number
 * @param {string} status - New order status
 */
const sendOrderStatusUpdate = async (email, orderNumber, status) => {
  const statusMessages = {
    confirmed: { emoji: '✅', title: 'Order Confirmed', msg: 'Your order has been confirmed and will be prepared shortly.' },
    preparing: { emoji: '👨‍🍳', title: 'Order Being Prepared', msg: 'Our chefs are carefully preparing your delicious pizza!' },
    'in-kitchen': { emoji: '🔥', title: 'Order in Kitchen', msg: 'Your pizza is in the oven! Almost ready.' },
    'out-for-delivery': { emoji: '🚴', title: 'Out for Delivery!', msg: 'Your order is on its way! Our delivery partner is heading to your location.' },
    delivered: { emoji: '🎉', title: 'Order Delivered!', msg: "Your order has been delivered. Enjoy your pizza! Don't forget to leave a review." },
    cancelled: { emoji: '❌', title: 'Order Cancelled', msg: 'Your order has been cancelled. If you paid, a refund will be processed within 5-7 business days.' },
  };

  const info = statusMessages[status] || { emoji: '📦', title: 'Order Update', msg: `Your order status has been updated to: ${status}` };

  const subject = `${info.emoji} PizzaHub - ${info.title} #${orderNumber}`;

  const content = `
    <div class="success-icon">${info.emoji}</div>
    <h2>${info.title}</h2>
    <p>${info.msg}</p>
    <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#888;">ORDER NUMBER</p>
      <p style="margin:5px 0 0;font-size:22px;font-weight:800;color:#FF6B35;">#${orderNumber}</p>
    </div>
    <p>Track your order in real-time on our app. 🍕</p>
  `;

  await sendEmail(email, subject, emailWrapper(content));
};

/**
 * Send low stock alert to admin
 * @param {string} adminEmail - Admin email
 * @param {Array} items - Low stock inventory items
 */
const sendLowStockAlert = async (adminEmail, items) => {
  const subject = '⚠️ PizzaHub Admin - Low Stock Alert!';

  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-transform:capitalize">${item.ingredientType}</td>
      <td style="text-align:center;color:#e74c3c;font-weight:700">${item.currentStock} ${item.unit}</td>
      <td style="text-align:center">${item.threshold} ${item.unit}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    <div class="success-icon">⚠️</div>
    <h2>Low Stock Alert</h2>
    <p>The following ingredients are running low and need to be restocked immediately:</p>
    <table>
      <thead>
        <tr><th>Item</th><th>Type</th><th style="text-align:center">Current Stock</th><th style="text-align:center">Threshold</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="alert">
      Please restock these items as soon as possible to avoid disruption to operations.
    </div>
    <p>Log in to the admin dashboard to update inventory levels.</p>
  `;

  await sendEmail(adminEmail, subject, emailWrapper(content));
};

/**
 * Send invoice email with PDF attachment
 * @param {string} email - Customer email
 * @param {Object} order - Order object
 * @param {Buffer} pdfBuffer - Invoice PDF buffer
 */
const sendInvoiceEmail = async (email, order, pdfBuffer) => {
  const subject = `🧾 PizzaHub - Invoice for Order #${order.orderNumber}`;

  const content = `
    <div class="success-icon">🧾</div>
    <h2>Your Invoice</h2>
    <p>Thank you for ordering from PizzaHub! Please find your invoice attached to this email.</p>
    <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#888;">ORDER NUMBER</p>
      <p style="margin:5px 0 0;font-size:22px;font-weight:800;color:#FF6B35;">#${order.orderNumber}</p>
      <p style="margin:10px 0 0;"><strong>Total:</strong> ₹${order.finalAmount.toFixed(2)}</p>
    </div>
    <p>Please keep this invoice for your records. We hope you enjoyed your order! 🍕</p>
  `;

  const attachments = [
    {
      filename: `PizzaHub-Invoice-${order.orderNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    },
  ];

  await sendEmail(email, subject, emailWrapper(content), attachments);
};

module.exports = {
  sendOTPEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendLowStockAlert,
  sendInvoiceEmail,
};
