// const nodemailer = require('nodemailer');
// const PropertySetting = require('../models/PropertySetting');

// // Create transporter once
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_APP_PASSWORD,
//   },
// });

// const getProperty = async () => {
//   return await PropertySetting.findOne() || {
//     name: 'The Core Pench',
//     address: 'Unknown',
//     city: 'Unknown',
//     state: 'Unknown',
//     phoneNumber: 'N/A',
//     email: process.env.EMAIL_USER || 'no-reply@example.com',
//   };
// };

// const sendEmail = async ({ to, subject, html }) => {
//   try {
//     const property = await getProperty();

//     await transporter.sendMail({
//       from: `"${property.name}" <${process.env.EMAIL_USER}>`,
//       to,
//       subject,
//       html,
//     });
//   } catch (error) {
//     console.error('Email send failed:', error);
//     // Don't throw - email failure shouldn't break core functionality
//   }
// };

// const sendBookingConfirmationEmail = async (booking, property) => {
//   const html = `
//     <h2>Booking Confirmed!</h2>
//     <p>Dear ${booking.name},</p>
//     <p>Your booking at <strong>${property.name}</strong> has been confirmed.</p>
//     <h3>Booking Details:</h3>
//     <ul>
//       <li>Room: ${booking.roomName}</li>
//       <li>Check-in: ${new Date(booking.checkedInDate).toLocaleDateString()}</li>
//       <li>Check-out: ${new Date(booking.checkOutDate).toLocaleDateString()}</li>
//       <li>Guests: ${booking.guests}</li>
//       <li>Total Amount: ₹${booking.totalAmount}</li>
//       <li>Advance Paid: ₹${booking.advancePaid}</li>
//       <li>Balance Due: ₹${booking.balance}</li>
//     </ul>
//     <p>We look forward to welcoming you!</p>
//     <p><strong>${property.name}</strong><br>${property.address}, ${property.city}</p>
//   `;

//   await sendEmail({
//     to: booking.email,
//     subject: `Booking Confirmed - ${property.name}`,
//     html,
//   });
// };

// const sendCheckInEmail = async (booking, property) => {
//   const html = `
//     <h2>Check-in Successful</h2>
//     <p>Dear ${booking.name},</p>
//     <p>You have successfully checked in to <strong>${booking.roomName}</strong> at ${property.name}.</p>
//     <p>Enjoy your stay!</p>
//   `;

//   await sendEmail({
//     to: booking.email,
//     subject: `Welcome! Check-in Confirmed - ${property.name}`,
//     html,
//   });
// };

// const sendCheckOutEmail = async (booking, payment, property) => {
//   const html = `
//     <h2>Thank You for Staying With Us!</h2>
//     <p>Dear ${booking.name},</p>
//     <p>We hope you enjoyed your stay at <strong>${property.name}</strong>.</p>
//     <h3>Payment Summary:</h3>
//     <ul>
//       <li>Total Amount: ₹${payment.totalAmount || booking.totalAmount}</li>
//       <li>Amount Paid: ₹${payment.paidAmount || booking.advancePaid}</li>
//       <li>Balance: ₹${booking.balance}</li>
//     </ul>
//     <p>We'd love to welcome you back soon!</p>
//   `;

//   await sendEmail({
//     to: booking.email,
//     subject: `Check-out Complete - ${property.name}`,
//     html,
//   });
// };

// module.exports = {
//   sendEmail,
//   sendBookingConfirmationEmail,
//   sendCheckInEmail,
//   sendCheckOutEmail,
// };


// const nodemailer = require('nodemailer');
// const PropertySetting = require('../models/PropertySetting');
// const BookingSetting = require('../models/BookingSetting');

// // Create transporter once
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_APP_PASSWORD,
//   },
// });

// const getProperty = async () => {
//   const property = await PropertySetting.findOne();
//   return property || {
//     name: 'The Core Pench',
//     address: 'Pench National Park Area',
//     city: 'Nagpur',
//     state: 'Maharashtra',
//     phoneNumber: '+91 98765 43210',
//     email: process.env.EMAIL_USER || 'reservations@thecorepench.com',
//     logoUrl: 'https://thecorepench.com/wp-content/uploads/2025/03/cropped-the-core.png', // ← Replace with your actual logo URL
//   };
// };

// const getBookingSettings = async () => {
//   return await BookingSetting.findOne() || {
//     checkInTime: '12:00 PM',
//     checkOutTime: '11:00 AM',
//   };
// };
// const logo = 'https://thecorepench.com/wp-content/uploads/2025/03/cropped-the-core.png';

// const sendEmail = async ({ to, subject, html }) => {
//   try {
//     const property = await getProperty();

//     await transporter.sendMail({
//       from: `"${property.name} Reservations" <${process.env.EMAIL_USER}>`,
//       to,
//       subject,
//       html,
//     });

//     console.log(`Email sent successfully to ${to}`);
//   } catch (error) {
//     console.error('Email send failed:', error);
//     // Optional: Log to error service or DB
//   }
// };

// // Beautiful, professional Booking Confirmation Email
// const sendBookingConfirmationEmail = async (booking, property) => {
//   const settings = await getBookingSettings();

//   const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>Booking Confirmed - ${property.name}</title>
//   <style>
//     body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; color: #333; }
//     .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
//     .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 40px 30px; text-align: center; }
//     .header img { max-width: 180px; margin-bottom: 15px; }
//     .content { padding: 40px 30px; line-height: 1.7; }
//     .highlight { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 6px; }
//     .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; }
//     .details table { width: 100%; border-collapse: collapse; }
//     .details td { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
//     .details td:first-child { font-weight: 600; width: 40%; color: #1f2937; }
//     .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
//     .footer { background: #f1f5f9; padding: 30px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e5e7eb; }
//     @media only screen and (max-width: 600px) {
//       .content { padding: 25px 20px; }
//       .header { padding: 30px 20px; }
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//      <img src="${logo}" alt="Logo">
//       <h1 style="margin: 0; font-size: 28px;">Booking Confirmed!</h1>
//     </div>

//     <div class="content">
//       <p>Dear <strong>${booking.name}</strong>,</p>
//       <p>We are delighted to confirm your booking at <strong>${property.name}</strong>!</p>

//       <div class="highlight">
//         <strong>Your reservation is confirmed.</strong> We look forward to welcoming you!
//       </div>

//       <div class="details">
//         <table>
//           <tr><td>Room Type</td><td>${booking.roomName}</td></tr>
//           <tr><td>Check-in Date</td><td>${new Date(booking.checkedInDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
//           <tr><td>Check-in Time</td><td><strong>${settings.checkInTime}</strong></td></tr>
//           <tr><td>Check-out Date</td><td>${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
//           <tr><td>Check-out Time</td><td><strong>${settings.checkOutTime}</strong></td></tr>
//           <tr><td>Number of Guests</td><td>${booking.guests}</td></tr>
//           <tr><td>Total Amount</td><td>₹${booking.totalAmount.toLocaleString('en-IN')}</td></tr>
//           <tr><td>Advance Paid</td><td>₹${booking.advancePaid.toLocaleString('en-IN')}</td></tr>
//           <tr><td>Balance Due</td><td><strong>₹${booking.balance.toLocaleString('en-IN')}</strong></td></tr>
//         </table>
//       </div>

//       <p style="text-align: center;">
//         <a href="#" class="button" style="color: white !important;">View Booking Details</a>
//       </p>

//       <p>We can't wait to make your stay unforgettable!</p>
//     </div>

//     <div class="footer">
//       <p><strong>${property.name}</strong><br>${property.address}, ${property.city}, ${property.state}</p>
//       <p>Contact: ${property.phoneNumber} | ${property.email}</p>
//       <p>© ${new Date().getFullYear()} ${property.name}. All rights reserved.</p>
//     </div>
//   </div>
// </body>
// </html>
//   `;

//   await sendEmail({
//     to: booking.email,
//     subject: `Booking Confirmed - Welcome to ${property.name}!`,
//     html,
//   });
// };

// // Check-in Email (Beautiful & Professional)
// const sendCheckInEmail = async (booking, property) => {
//   const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>Check-in Confirmed - ${property.name}</title>
//   <style>
//     body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f4f7fa; color: #333; }
//     .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
//     .header { background: linear-gradient(135deg, #065f46, #10b981); color: white; padding: 40px 30px; text-align: center; }
//     .header img { max-width: 180px; margin-bottom: 15px; }
//     .content { padding: 40px 30px; line-height: 1.7; }
//     .welcome { font-size: 24px; font-weight: bold; color: #065f46; margin-bottom: 20px; }
//     .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; }
//     .footer { background: #f1f5f9; padding: 30px; text-align: center; font-size: 13px; color: #64748b; }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//       <img src="${logo}" alt="Logo">
//       <h1>Welcome!</h1>
//     </div>

//     <div class="content">
//       <p class="welcome">Hello ${booking.name},</p>
      
//       <div class="highlight">
//         <strong>You have successfully checked in!</strong><br>
//         We are thrilled to have you with us at <strong>${property.name}</strong>.
//       </div>

//       <p>Enjoy your stay and take full advantage of our facilities.</p>
      
//       <p style="text-align: center; margin-top: 30px;">
//         <a href="#" style="background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
//           Explore Our Services
//         </a>
//       </p>
//     </div>

//     <div class="footer">
//       <p><strong>${property.name}</strong><br>${property.address}, ${property.city}</p>
//       <p>Contact: ${property.phoneNumber} | ${property.email}</p>
//       <p>© ${new Date().getFullYear()} ${property.name}</p>
//     </div>
//   </div>
// </body>
// </html>
//   `;

//   await sendEmail({
//     to: booking.email,
//     subject: `Welcome! Check-in Confirmed at ${property.name}`,
//     html,
//   });
// };

// // Check-out Email (Thank You & Professional)
// const sendCheckOutEmail = async (booking, payment, property) => {
//   const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>Thank You - ${property.name}</title>
//   <style>
//     body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f4f7fa; color: #333; }
//     .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
//     .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 40px 30px; text-align: center; }
//     .header img { max-width: 180px; margin-bottom: 15px; }
//     .content { padding: 40px 30px; line-height: 1.7; }
//     .thanks { font-size: 26px; font-weight: bold; color: #1e40af; margin-bottom: 20px; }
//     .summary { background: #eff6ff; padding: 25px; border-radius: 10px; margin: 25px 0; }
//     .footer { background: #f1f5f9; padding: 30px; text-align: center; font-size: 13px; color: #64748b; }
//     .button { display: inline-block; background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//        <img src="${logo}" alt="Logo">
//       <h1>Thank You!</h1>
//     </div>

//     <div class="content">
//       <p class="thanks">Dear ${booking.name},</p>
//       <p>Thank you for choosing <strong>${property.name}</strong>. We truly hope you had a memorable stay!</p>

//       <div class="summary">
//         <strong>Payment Summary:</strong>
//         <ul style="list-style: none; padding-left: 0; margin: 15px 0;">
//           <li><strong>Total Amount:</strong> ₹${payment.totalAmount || booking.totalAmount}</li>
//           <li><strong>Amount Paid:</strong> ₹${payment.paidAmount || booking.advancePaid}</li>
//           <li><strong>Balance:</strong> ₹${booking.balance}</li>
//         </ul>
//       </div>

//       <p>We would be delighted to welcome you back soon!</p>

//       <p style="text-align: center;">
//         <a href="#" class="button">Leave a Review</a>
//       </p>
//     </div>

//     <div class="footer">
//       <p><strong>${property.name}</strong><br>${property.address}, ${property.city}</p>
//       <p>Contact: ${property.phoneNumber} | ${property.email}</p>
//       <p>© ${new Date().getFullYear()} ${property.name}. All rights reserved.</p>
//     </div>
//   </div>
// </body>
// </html>
//   `;

//   await sendEmail({
//     to: booking.email,
//     subject: `Thank You for Staying with ${property.name}`,
//     html,
//   });
// };

// module.exports = {
//   sendEmail,
//   sendBookingConfirmationEmail,
//   sendCheckInEmail,
//   sendCheckOutEmail,
// };


const nodemailer = require('nodemailer');
const PropertySetting = require('../models/PropertySetting');
const BookingSetting = require('../models/BookingSetting');

// Create transporter once (recommended for performance)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Fetch property from DB only
const getProperty = async () => {
  const property = await PropertySetting.findOne();
  return property || {
    name: 'Srushti Jungle Homes',
    address: ' Nr. Sillari Gate, Pench',
    city: 'Nagpur',
    state: 'Maharashtra',
    phoneNumber: '+91 9096379461',
    email: process.env.EMAIL_USER || 'srushtijunglehomes@gmail.com'
    
  };
};

const logoUrl = 'https://instagram.fnag4-2.fna.fbcdn.net/v/t51.2885-19/59881846_1003794769824861_6363815629023084544_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fnag4-2.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2QGr6wZVCgl3_JTb5UaZpr2uoYbxTDHq4UBaXYCH7Edy9W5nr2VkyONPWvgKt37SKr-IyUuQdg8w80oEVTgo2Tck&_nc_ohc=NlIdozjXMKUQ7kNvwGtr2jT&_nc_gid=IGY-4j-8HXQftNfcNUTAgg&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_Afq7HzQJ9CzelkNsVRKiK3pPWnQ4bvN8b5HrGcW9Lj5Pqg&oe=696C1DA5&_nc_sid=8b3546';

// Fetch booking settings from DB only
const getBookingSettings = async () => {
  const settings = await BookingSetting.findOne();
  return settings || {
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
  };
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const property = await getProperty();

    await transporter.sendMail({
      from: `"${property.name} Reservations" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Email send failed:', error);
    // Silent failure - do not break the main flow
  }
};

// === Professional Booking Confirmation Email ===
const sendBookingConfirmationEmail = async (booking) => {
  const property = await getProperty();
  const settings = await getBookingSettings();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Confirmed - ${property.name}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 50px 40px; text-align: center; }
    .header img { max-width: 200px; margin-bottom: 20px; border-radius: 8px; }
    .content { padding: 50px 40px; line-height: 1.8; }
    .title { font-size: 32px; font-weight: 700; color: #1e40af; margin-bottom: 10px; }
    .subtitle { font-size: 18px; color: #475569; margin-bottom: 30px; }
    .highlight { background: #f0f9ff; border-left: 5px solid #3b82f6; padding: 20px 25px; margin: 30px 0; border-radius: 8px; }
    .details { background: #f8fafc; padding: 30px; border-radius: 12px; margin: 35px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
    .details td:first-child { font-weight: 600; width: 38%; color: #334155; }
    .details td:last-child { text-align: right; font-weight: 500; }
    .footer { background: #f1f5f9; padding: 40px 40px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
    @media only screen and (max-width: 620px) {
      .content, .header { padding: 35px 25px; }
      .details { padding: 25px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : ''}
      <h1 class="title">Booking Confirmed!</h1>
      <p class="subtitle">We are delighted to have you with us</p>
    </div>

    <div class="content">
      <p>Dear <strong>${booking.name}</strong>,</p>
      <p>Your reservation at <strong>${property.name}</strong> has been successfully confirmed.</p>

      <div class="highlight">
        <strong>Reservation is confirmed.</strong><br>
        We look forward to welcoming you soon!
      </div>

      <div class="details">
        <table>
          <tr><td>Room Type</td><td>${booking.roomName}</td></tr>
          <tr><td>Check-in Date</td><td>${new Date(booking.checkedInDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          <tr><td>Check-in Time</td><td><strong>${settings.checkInTime}</strong></td></tr>
          <tr><td>Check-out Date</td><td>${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          <tr><td>Check-out Time</td><td><strong>${settings.checkOutTime}</strong></td></tr>
          <tr><td>Number of Guests</td><td>${booking.guests}</td></tr>
          <tr><td>Total Amount</td><td>₹${booking.totalAmount?.toLocaleString('en-IN') || 'N/A'}</td></tr>
          <tr><td>Advance Paid</td><td>₹${booking.advancePaid?.toLocaleString('en-IN') || '0'}</td></tr>
          <tr><td>Balance Due</td><td><strong>₹${booking.balance?.toLocaleString('en-IN') || 'N/A'}</strong></td></tr>
        </table>
      </div>

      <p style="margin-top: 30px;">We are excited to make your stay memorable and comfortable.</p>
    </div>

    <div class="footer">
      <p><strong>${property.name}</strong><br>${property.address}, ${property.city}, ${property.state}</p>
      <p>Contact: ${property.phoneNumber} | ${property.email}</p>
      <p>© ${new Date().getFullYear()} ${property.name}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: booking.email,
    subject: `Booking Confirmed - Welcome to ${property.name}`,
    html,
  });
};

// === Elegant Check-in Welcome Email ===
const sendCheckInEmail = async (booking, property) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to ${property.name}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #1e293b; }
    .container { max-width: 620px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #065f46, #10b981); color: white; padding: 50px 40px; text-align: center; }
    .header img { max-width: 200px; margin-bottom: 20px; border-radius: 8px; }
    .content { padding: 50px 40px; line-height: 1.8; }
    .welcome { font-size: 32px; font-weight: 700; color: #065f46; margin-bottom: 15px; }
    .highlight { background: #ecfdf5; border-left: 5px solid #10b981; padding: 25px 30px; margin: 30px 0; border-radius: 10px; font-size: 18px; }
    .footer { background: #f1f5f9; padding: 40px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : ''}
      <h1>Welcome!</h1>
    </div>

    <div class="content">
      <p class="welcome">Hello ${booking.name},</p>
      
      <div class="highlight">
        <strong>You have successfully checked in!</strong><br>
        We are delighted to have you with us at <strong>${property.name}</strong>.
      </div>

      <p>Relax, unwind, and enjoy everything our property has to offer.</p>
      
      <p>Wishing you a wonderful and refreshing stay!</p>
    </div>

    <div class="footer">
      <p><strong>${property.name}</strong><br>${property.address}, ${property.city}</p>
      <p>Contact: ${property.phoneNumber} | ${property.email}</p>
      <p>© ${new Date().getFullYear()} ${property.name}</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: booking.email,
    subject: `Welcome! Check-in Confirmed at ${property.name}`,
    html,
  });
};

// === Elegant Thank You Check-out Email ===
const sendCheckOutEmail = async (booking, payment, property) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Thank You - ${property.name}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #1e293b; }
    .container { max-width: 620px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 50px 40px; text-align: center; }
    .header img { max-width: 200px; margin-bottom: 20px; border-radius: 8px; }
    .content { padding: 50px 40px; line-height: 1.8; }
    .thanks { font-size: 32px; font-weight: 700; color: #1e40af; margin-bottom: 15px; }
    .summary { background: #eff6ff; padding: 30px; border-radius: 12px; margin: 35px 0; }
    .summary table { width: 100%; border-collapse: collapse; }
    .summary td { padding: 14px 0; border-bottom: 1px solid #dbeafe; }
    .summary td:first-child { font-weight: 600; width: 40%; }
    .footer { background: #f1f5f9; padding: 40px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : ''}
      <h1>Thank You!</h1>
    </div>

    <div class="content">
      <p class="thanks">Dear ${booking.name},</p>
      <p>Thank you for choosing <strong>${property.name}</strong>. We truly hope you had a wonderful and memorable stay with us.</p>

      <div class="summary">
        <strong>Payment Summary:</strong>
        <table>
          <tr><td>Total Amount</td><td>₹${(payment?.totalAmount || booking.totalAmount).toLocaleString('en-IN')}</td></tr>
          <tr><td>Amount Paid</td><td>₹${(payment?.paidAmount || booking.advancePaid).toLocaleString('en-IN')}</td></tr>
          <tr><td>Balance</td><td>₹${booking.balance.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>

      <p>We look forward to welcoming you back soon!</p>
    </div>

    <div class="footer">
      <p><strong>${property.name}</strong><br>${property.address}, ${property.city}</p>
      <p>Contact: ${property.phoneNumber} | ${property.email}</p>
      <p>© ${new Date().getFullYear()} ${property.name}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: booking.email,
    subject: `Thank You for Staying with ${property.name}`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendBookingConfirmationEmail,
  sendCheckInEmail,
  sendCheckOutEmail,
};