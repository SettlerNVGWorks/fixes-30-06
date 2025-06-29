const nodemailer = require('nodemailer');
const { google } = require('google-auth-library');
require('dotenv').config();

// OAuth2 Configuration
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Create transporter
const createTransporter = async () => {
  try {
    const accessToken = await oAuth2Client.getAccessToken();
    
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Email verification template
const getVerificationEmailTemplate = (verificationLink, userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { 
                background: linear-gradient(135deg, #fbbf24, #d97706); 
                color: white; 
                padding: 20px; 
                text-align: center; 
                border-radius: 8px 8px 0 0;
            }
            .content { 
                padding: 30px; 
                background: #ffffff;
                border: 1px solid #fbbf24;
                border-top: none;
            }
            .button { 
                background: linear-gradient(135deg, #fbbf24, #d97706);
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 8px; 
                display: inline-block; 
                margin: 20px 0;
                font-weight: bold;
            }
            .footer { 
                background-color: #1f2937; 
                color: #9ca3af;
                padding: 20px; 
                text-align: center; 
                font-size: 12px;
                border-radius: 0 0 8px 8px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">👑 ПРОГНОЗЫ НА СПОРТ №1</div>
                <h1>Подтверждение Email</h1>
            </div>
            <div class="content">
                <h2>Добро пожаловать${userName ? ', ' + userName : ''}!</h2>
                <p>Спасибо за регистрацию на нашем сайте спортивных прогнозов!</p>
                <p>Чтобы завершить регистрацию, пожалуйста, подтвердите ваш email адрес:</p>
                <div style="text-align: center;">
                    <a href="${verificationLink}" class="button">✅ Подтвердить Email</a>
                </div>
                <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
                <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verificationLink}</p>
                <p style="color: #dc2626; font-size: 14px;"><strong>⏰ Эта ссылка действительна в течение 24 часов.</strong></p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                    После подтверждения вы получите доступ к эксклюзивным спортивным прогнозам и аналитике от лучших экспертов!
                </p>
            </div>
            <div class="footer">
                <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
                <p>© 2025 Прогнозы на спорт №1. Все права защищены.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send verification email
const sendVerificationEmail = async (email, verificationToken, userName = '') => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"Прогнозы на спорт №1" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ Подтвердите ваш email - Прогнозы на спорт №1',
      html: getVerificationEmailTemplate(verificationLink, userName)
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully to:', email);
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName = '') => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const transporter = await createTransporter();
    
    const resetEmailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { 
                  background: linear-gradient(135deg, #dc2626, #991b1b); 
                  color: white; 
                  padding: 20px; 
                  text-align: center; 
                  border-radius: 8px 8px 0 0;
              }
              .content { 
                  padding: 30px; 
                  background: #ffffff;
                  border: 1px solid #dc2626;
                  border-top: none;
              }
              .button { 
                  background: linear-gradient(135deg, #dc2626, #991b1b);
                  color: white; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  display: inline-block; 
                  margin: 20px 0;
                  font-weight: bold;
              }
              .footer { 
                  background-color: #1f2937; 
                  color: #9ca3af;
                  padding: 20px; 
                  text-align: center; 
                  font-size: 12px;
                  border-radius: 0 0 8px 8px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔐 Сброс пароля</h1>
              </div>
              <div class="content">
                  <h2>Здравствуйте${userName ? ', ' + userName : ''}!</h2>
                  <p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
                  <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
                  <div style="text-align: center;">
                      <a href="${resetLink}" class="button">🔑 Сбросить пароль</a>
                  </div>
                  <p style="color: #dc2626; font-size: 14px;"><strong>⏰ Эта ссылка действительна в течение 1 часа.</strong></p>
                  <p style="color: #6b7280; font-size: 14px;">
                      Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                  </p>
              </div>
              <div class="footer">
                  <p>© 2025 Прогнозы на спорт №1. Все права защищены.</p>
              </div>
          </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: `"Прогнозы на спорт №1" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Сброс пароля - Прогнозы на спорт №1',
      html: resetEmailTemplate
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully to:', email);
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};