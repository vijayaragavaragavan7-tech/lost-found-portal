const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendContactEmail({ toEmail, toName, fromName, itemTitle, message }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email not configured - skipping send.");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Lost & Found Portal" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Someone contacted you about "${itemTitle}"`,
      text: `Hi ${toName},\n\n${fromName} sent you a message about your item "${itemTitle}":\n\n"${message}"\n\nLog in to the Lost & Found Portal to reply.\n`,
    });
    console.log("Contact email sent to", toEmail);
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
}

module.exports = { sendContactEmail };
