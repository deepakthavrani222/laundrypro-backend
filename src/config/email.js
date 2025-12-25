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

  orderConfirmation: (order, user, items = []) => ({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `✅ Order Confirmed - ${order.orderNumber} | LaundryPro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #14b8a6, #06b6d4); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LaundryPro</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Premium Laundry & Dry Cleaning</p>
          </div>
          
          <!-- Success Banner -->
          <div style="background: #10b981; padding: 20px; text-align: center;">
            <div style="background: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 30px;">✓</span>
            </div>
            <h2 style="color: white; margin: 0; font-size: 22px;">Order Confirmed!</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Thank you for choosing LaundryPro</p>
          </div>
          
          <!-- Main Content -->
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Greeting -->
            <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">
              Hi <strong>${user.name || 'Valued Customer'}</strong>,<br><br>
              Your laundry order has been successfully placed! Our team will pick up your clothes at the scheduled time.
            </p>
            
            <!-- Order Number Box -->
            <div style="background: #f0fdfa; border: 2px dashed #14b8a6; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
              <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
              <p style="color: #0d9488; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${order.orderNumber}</p>
            </div>
            
            <!-- Order Details Grid -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">📋 Order Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Pickup Date</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 500;">${new Date(order.pickupDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">⏰ Pickup Time</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 500;">${order.pickupTimeSlot}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📦 Estimated Delivery</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 500;">${order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : '2-3 Days'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🚀 Service Type</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 500;">${order.isExpress ? '⚡ Express' : 'Standard'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">💳 Payment</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 500;">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</td>
                </tr>
              </table>
            </div>
            
            <!-- Pickup Address -->
            <div style="background: #fef3c7; padding: 15px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">📍 Pickup Address</h4>
              <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
                ${order.pickupAddress?.name || ''}<br>
                ${order.pickupAddress?.addressLine1 || ''}${order.pickupAddress?.landmark ? ', ' + order.pickupAddress.landmark : ''}<br>
                ${order.pickupAddress?.city || ''} - ${order.pickupAddress?.pincode || ''}<br>
                📞 ${order.pickupAddress?.phone || ''}
              </p>
            </div>
            
            <!-- Price Summary -->
            <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">Total Amount</p>
                  <p style="color: white; margin: 5px 0 0 0; font-size: 28px; font-weight: bold;">₹${order.pricing?.total || order.totalAmount || '0'}</p>
                </div>
                <div style="text-align: right;">
                  <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 12px;">Items: ${items.length || 'Multiple'}</p>
                  ${order.pricing?.deliveryCharge ? `<p style="color: rgba(255,255,255,0.8); margin: 3px 0 0 0; font-size: 12px;">Delivery: ₹${order.pricing.deliveryCharge}</p>` : ''}
                </div>
              </div>
            </div>
            
            <!-- Track Order Button -->
            <div style="text-align: center; margin-bottom: 25px;">
              <a href="${process.env.FRONTEND_URL}/customer/orders" 
                 style="background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                🔍 Track Your Order
              </a>
            </div>
            
            <!-- Help Section -->
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 13px;">
                Need help? Contact us at<br>
                📞 <a href="tel:+919876543210" style="color: #14b8a6; text-decoration: none;">+91 98765 43210</a> | 
                📧 <a href="mailto:support@laundrypro.com" style="color: #14b8a6; text-decoration: none;">support@laundrypro.com</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0 0 10px 0;">Thank you for choosing LaundryPro! 💚</p>
            <p style="margin: 0;">© ${new Date().getFullYear()} LaundryPro. All rights reserved.</p>
          </div>
          
        </div>
      </body>
      </html>
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
  }),

  // Admin Invitation Email
  adminInvitation: (invitation, inviterName) => ({
    from: process.env.EMAIL_USER,
    to: invitation.email,
    subject: "You're invited to join LaundryPro as Admin",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #14b8a6; margin: 0;">LaundryPro</h1>
          <p style="color: #6b7280; margin: 5px 0;">Admin Invitation</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">You've Been Invited!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            ${inviterName} has invited you to join LaundryPro as <strong>${invitation.role === 'center_admin' ? 'Center Admin' : 'Admin'}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Invitation Details</h3>
            <p><strong>Role:</strong> ${invitation.role === 'center_admin' ? 'Center Admin' : 'Admin'}</p>
            <p><strong>Email:</strong> ${invitation.email}</p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Click the button below to set up your password and activate your account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/auth/accept-invitation?token=${invitation.invitationToken}" 
               style="background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Accept Invitation & Set Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${process.env.FRONTEND_URL}/auth/accept-invitation?token=${invitation.invitationToken}" style="color: #14b8a6; word-break: break-all;">
              ${process.env.FRONTEND_URL}/auth/accept-invitation?token=${invitation.invitationToken}
            </a>
          </p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This invitation link will expire in 48 hours.</p>
          <p>If you didn't expect this invitation, please ignore this email.</p>
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