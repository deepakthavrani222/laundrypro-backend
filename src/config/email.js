const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password
    }
  });
};

// Email templates
const emailTemplates = {
  verification: (token, userEmail) => ({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Verify your LaundryPro account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #14b8a6; margin: 0;">LaundryPro</h1>
          <p style="color: #6b7280; margin: 5px 0;">Premium Laundry & Dry Cleaning Service</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to LaundryPro!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Thank you for registering with LaundryPro. To complete your account setup and start using our premium laundry services, please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/auth/verify-email?token=${token}" 
               style="background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${process.env.FRONTEND_URL}/auth/verify-email?token=${token}" style="color: #14b8a6; word-break: break-all;">
              ${process.env.FRONTEND_URL}/auth/verify-email?token=${token}
            </a>
          </p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This verification link will expire in 24 hours.</p>
          <p>If you didn't create an account with LaundryPro, please ignore this email.</p>
        </div>
      </div>
    `
  }),

  orderConfirmation: (order, user) => ({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Order Confirmed - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #14b8a6; margin: 0;">LaundryPro</h1>
          <p style="color: #6b7280; margin: 5px 0;">Order Confirmation</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Order Confirmed!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Hi ${user.name}, your order has been confirmed and is being processed.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Pickup Date:</strong> ${new Date(order.pickupDate).toLocaleDateString()}</p>
            <p><strong>Pickup Time:</strong> ${order.pickupTimeSlot}</p>
            <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">
            We'll send you updates as your order progresses. You can track your order status in your dashboard.
          </p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/customer/orders/${order._id}" 
             style="background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Track Order
          </a>
        </div>
      </div>
    `
  }),

  statusUpdate: (order, user, newStatus) => ({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Order Update - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #14b8a6; margin: 0;">LaundryPro</h1>
          <p style="color: #6b7280; margin: 5px 0;">Order Status Update</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Order Status Updated</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Hi ${user.name}, your order ${order.orderNumber} status has been updated.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Current Status</h3>
            <div style="background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: capitalize;">
              ${newStatus.replace('-', ' ')}
            </div>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/customer/orders/${order._id}" 
             style="background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Order Details
          </a>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (emailOptions) => {
  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(emailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email configuration verification failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  emailTemplates,
  verifyEmailConfig
};