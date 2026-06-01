const PDFDocument = require('pdfkit');

/**
 * Generate a PDF invoice for an order
 * @param {Object} order - Populated order object
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 25, left: 50, right: 50 },
        info: {
          Title: `PizzaHub Invoice - ${order.orderNumber}`,
          Author: 'PizzaHub',
          Subject: 'Order Invoice',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- HEADER ----
      doc
        .rect(0, 0, doc.page.width, 100)
        .fill('#FF6B35');

      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(28)
        .text('PizzaHub', 50, 30, { align: 'left' });

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('rgba(255,255,255,0.85)')
        .text('Delicious Pizzas, Delivered Fast', 50, 65, { align: 'left' });

      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('TAX INVOICE', 0, 40, { align: 'right', width: doc.page.width - 50 });

      doc.moveDown();

      // ---- INVOICE DETAILS ----
      const invoiceTop = 120;

      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(`Invoice`, 50, invoiceTop);

      // Order info box
      doc
        .rect(50, invoiceTop + 35, 240, 80)
        .fillAndStroke('#FFF8F5', '#FFD4C0');

      doc
        .fillColor('#FF6B35')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('ORDER NUMBER', 65, invoiceTop + 50);
      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(`#${order.orderNumber}`, 65, invoiceTop + 65);

      doc
        .fillColor('#888888')
        .font('Helvetica')
        .fontSize(10)
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 65, invoiceTop + 90);

      // Customer info
      doc
        .rect(310, invoiceTop + 35, 240, 80)
        .fillAndStroke('#F9F9F9', '#EEEEEE');

      doc
        .fillColor('#888888')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('BILL TO', 325, invoiceTop + 50);

      const customerName = order.user && order.user.name ? order.user.name : 'Customer';
      const customerEmail = order.user && order.user.email ? order.user.email : '';

      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(customerName, 325, invoiceTop + 65);
      doc
        .fillColor('#555555')
        .font('Helvetica')
        .fontSize(10)
        .text(customerEmail, 325, invoiceTop + 82)
        .text(order.deliveryAddress.phone, 325, invoiceTop + 95);

      // ---- ITEMS TABLE ----
      const tableTop = invoiceTop + 140;

      // Table header
      doc
        .rect(50, tableTop, 495, 30)
        .fill('#333333');

      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ITEM', 65, tableTop + 9)
        .text('SIZE', 260, tableTop + 9)
        .text('QTY', 330, tableTop + 9)
        .text('UNIT PRICE', 380, tableTop + 9)
        .text('TOTAL', 460, tableTop + 9);

      // Table rows
      let rowTop = tableTop + 30;
      let isEven = false;

      order.items.forEach((item) => {
        if (rowTop > 700) {
          doc.addPage();
          rowTop = 50;
        }

        if (isEven) {
          doc.rect(50, rowTop, 495, 28).fill('#F9F9F9');
        }

        doc
          .fillColor('#333333')
          .font('Helvetica')
          .fontSize(11)
          .text(item.name, 65, rowTop + 8, { width: 190, ellipsis: true })
          .text(item.size.charAt(0).toUpperCase() + item.size.slice(1), 260, rowTop + 8)
          .text(item.quantity.toString(), 335, rowTop + 8)
          .text(`₹${item.price.toFixed(2)}`, 375, rowTop + 8)
          .text(`₹${(item.price * item.quantity).toFixed(2)}`, 455, rowTop + 8);

        doc
          .moveTo(50, rowTop + 28)
          .lineTo(545, rowTop + 28)
          .stroke('#EEEEEE');

        rowTop += 28;
        isEven = !isEven;
      });

      // ---- TOTALS ----
      const totalsTop = rowTop + 20;

      // Totals box
      doc
        .rect(350, totalsTop, 195, 110)
        .fillAndStroke('#FFF8F5', '#FFD4C0');

      doc
        .fillColor('#555555')
        .font('Helvetica')
        .fontSize(11)
        .text('Subtotal:', 365, totalsTop + 15)
        .text(`₹${order.totalAmount.toFixed(2)}`, 490, totalsTop + 15, { align: 'right', width: 50 });

      if (order.discountAmount > 0) {
        doc
          .fillColor('#2ecc71')
          .text(`Discount (${order.couponCode || 'Coupon'}):`, 365, totalsTop + 35)
          .text(`-₹${order.discountAmount.toFixed(2)}`, 490, totalsTop + 35, { align: 'right', width: 50 });
      }

      doc
        .fillColor('#555555')
        .text('Delivery Fee:', 365, totalsTop + (order.discountAmount > 0 ? 55 : 35))
        .text(`₹${order.deliveryFee.toFixed(2)}`, 490, totalsTop + (order.discountAmount > 0 ? 55 : 35), { align: 'right', width: 50 });

      // Total line
      doc
        .moveTo(365, totalsTop + 78)
        .lineTo(535, totalsTop + 78)
        .stroke('#FF6B35');

      doc
        .fillColor('#FF6B35')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('TOTAL:', 365, totalsTop + 86)
        .text(`₹${order.finalAmount.toFixed(2)}`, 430, totalsTop + 86, { align: 'right', width: 100 });

      // ---- PAYMENT INFO ----
      const paymentTop = totalsTop + 130;

      doc
        .rect(50, paymentTop, 240, 60)
        .fillAndStroke('#F0FFF4', '#B7E4C7');

      doc
        .fillColor('#888888')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('PAYMENT STATUS', 65, paymentTop + 12);

      doc
        .fillColor(order.paymentStatus === 'paid' ? '#27ae60' : '#e74c3c')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(order.paymentStatus.toUpperCase(), 65, paymentTop + 28);

      // ---- DELIVERY ADDRESS ----
      doc
        .rect(310, paymentTop, 240, 60)
        .fillAndStroke('#F9F9F9', '#EEEEEE');

      doc
        .fillColor('#888888')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('DELIVERY ADDRESS', 325, paymentTop + 12);

      doc
        .fillColor('#555555')
        .font('Helvetica')
        .fontSize(10)
        .text(
          `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`,
          325,
          paymentTop + 28,
          { width: 220 }
        );

      // ---- FOOTER ----
      doc
        .rect(0, doc.page.height - 60, doc.page.width, 60)
        .fill('#333333');

      doc
        .fillColor('#ffffff')
        .font('Helvetica')
        .fontSize(10)
        .text('Thank you for choosing PizzaHub!  |  support@pizzahub.com', 50, doc.page.height - 38, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };
