const pug = require('pug');
const htmlToText = require('html-to-text');
const nodemailer = require('nodemailer');

// new Email(user, url).sendWelcome();

module.exports = class Email {
  constructor(user, data) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.from = `ddowl <${process.env.EMAIL_FROM}>`;
    this.data = data;
  }

  newTransport() {
    // 1) Create a transporter

    // Mailchimp also doesnt work
    // if (process.env.NODE_ENV === 'production') {
    //   // Sendgrid not work, use mailchimp instead
    //   return nodemailer.createTransport({
    //     host: process.env.MAILCHIMP_HOST,
    //     port: process.env.MAILCHIMP_PORT,
    //     auth: {
    //       user: process.env.MAILCHIMP_USERNAME,
    //       pass: process.env.MAILCHIMP_PASSWORD,
    //     },
    //   });
    // }
    // else
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        subject,
        data: this.data,
      }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.htmlToText(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
