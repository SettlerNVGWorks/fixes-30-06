const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');
const { getDatabase, createTelegramAuthSession, updateTelegramAuthSession, getTelegramAuthSession } = require('../database_mongo');
const authMiddleware = require('../middleware_mongo');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailServiceSendGrid');
const { generateTelegramLoginUrl, handleAuthConfirmation } = require('../services/telegramService');

const router = express.Router();

// Generate secure tokens
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register new user with email
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Validation
    if (!email || !username || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Введите корректный email адрес' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Пароли не совпадают' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      } else {
        return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = generateSecureToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const newUser = {
      email: email.toLowerCase(),
      username: username,
      password: hashedPassword,
      is_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationTokenExpires,
      auth_method: 'email', // 'email' or 'telegram'
      telegram_user_id: null,
      telegram_username: null,
      registration_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken, username);
    
    if (!emailResult.success) {
      // Remove user if email failed to send
      await db.collection('users').deleteOne({ _id: result.insertedId });
      return res.status(500).json({ error: 'Не удалось отправить письмо подтверждения' });
    }

    res.status(201).json({
      message: 'Регистрация успешна! Проверьте email для подтверждения аккаунта',
      user_id: result.insertedId,
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Токен подтверждения обязателен' });
    }

    const db = getDatabase();

    // Find user with valid verification token
    const user = await db.collection('users').findOne({
      verification_token: token,
      verification_token_expires: { $gt: new Date() },
      is_verified: false
    });

    if (!user) {
      return res.status(400).json({ error: 'Неверный или истёкший токен подтверждения' });
    }

    // Update user as verified
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          is_verified: true,
          updated_at: new Date()
        },
        $unset: {
          verification_token: '',
          verification_token_expires: ''
        }
      }
    );

    // Generate JWT token for auto-login
    const jwtToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Email успешно подтверждён!',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        registration_date: user.registration_date
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Ошибка сервера при подтверждении email' });
  }
});

// Login user with email
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const db = getDatabase();

    // Find user by email
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase(),
      auth_method: 'email'
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(401).json({ 
        error: 'Аккаунт не подтверждён. Проверьте email для подтверждения',
        require_verification: true
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        registration_date: user.registration_date,
        auth_method: user.auth_method
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const db = getDatabase();

    // Find unverified user
    const user = await db.collection('users').findOne({
      email: email.toLowerCase(),
      is_verified: false
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден или уже подтверждён' });
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          verification_token: verificationToken,
          verification_token_expires: verificationTokenExpires,
          updated_at: new Date()
        }
      }
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken, user.username);
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Не удалось отправить письмо подтверждения' });
    }

    res.json({ message: 'Письмо подтверждения отправлено повторно' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Ошибка сервера при отправке подтверждения' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const db = getDatabase();

    // Find user by email
    const user = await db.collection('users').findOne({
      email: email.toLowerCase(),
      is_verified: true
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'Если аккаунт с таким email существует, письмо для сброса пароля будет отправлено' });
    }

    // Generate password reset token
    const resetToken = generateSecureToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password_reset_token: resetToken,
          password_reset_token_expires: resetTokenExpires,
          updated_at: new Date()
        }
      }
    );

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, user.username);
    
    if (!emailResult.success) {
      console.error('Failed to send password reset email');
    }

    res.json({ message: 'Если аккаунт с таким email существует, письмо для сброса пароля будет отправлено' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Ошибка сервера при запросе сброса пароля' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Пароли не совпадают' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const db = getDatabase();

    // Find user with valid reset token
    const user = await db.collection('users').findOne({
      password_reset_token: token,
      password_reset_token_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Неверный или истёкший токен сброса пароля' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and remove reset token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updated_at: new Date()
        },
        $unset: {
          password_reset_token: '',
          password_reset_token_expires: ''
        }
      }
    );

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Ошибка сервера при сбросе пароля' });
  }
});

// Start Telegram authentication
router.post('/telegram-auth-start', async (req, res) => {
  try {
    const { email } = req.body;

    // Generate auth token
    const authToken = generateSecureToken();

    // Create auth session
    await createTelegramAuthSession(authToken, email);

    // Generate Telegram bot URL
    const telegramUrl = generateTelegramLoginUrl(authToken);

    res.json({
      auth_token: authToken,
      telegram_url: telegramUrl,
      message: 'Перейдите по ссылке в Telegram для подтверждения входа'
    });
  } catch (error) {
    console.error('Telegram auth start error:', error);
    res.status(500).json({ error: 'Ошибка при инициации Telegram авторизации' });
  }
});

// Check Telegram auth status
router.get('/telegram-auth-status/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const session = await getTelegramAuthSession(token);

    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    if (session.expires_at < new Date()) {
      return res.status(400).json({ error: 'Сессия истекла' });
    }

    if (session.status === 'confirmed') {
      const db = getDatabase();
      
      // Find or create user with Telegram info
      let user = await db.collection('users').findOne({
        telegram_user_id: session.telegram_user_info?.id
      });

      if (!user && session.user_email) {
        // Link to existing email account
        user = await db.collection('users').findOne({
          email: session.user_email.toLowerCase()
        });

        if (user) {
          // Link Telegram to existing account
          await db.collection('users').updateOne(
            { _id: user._id },
            {
              $set: {
                telegram_user_id: session.telegram_user_info.id,
                telegram_username: session.telegram_user_info.username,
                is_verified: true,
                updated_at: new Date()
              }
            }
          );
        }
      }

      if (!user && session.telegram_user_info) {
        // Create new user from Telegram
        const newUser = {
          email: null,
          username: session.telegram_user_info.username || session.telegram_user_info.first_name,
          password: null,
          is_verified: true,
          auth_method: 'telegram',
          telegram_user_id: session.telegram_user_info.id,
          telegram_username: session.telegram_user_info.username,
          registration_date: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        };

        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }

      if (user) {
        // Generate JWT token
        const jwtToken = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE }
        );

        return res.json({
          status: 'confirmed',
          token: jwtToken,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            registration_date: user.registration_date,
            auth_method: user.auth_method
          }
        });
      }
    }

    res.json({
      status: session.status,
      expires_at: session.expires_at
    });
  } catch (error) {
    console.error('Telegram auth status error:', error);
    res.status(500).json({ error: 'Ошибка при проверке статуса Telegram авторизации' });
  }
});

// Get user by Telegram ID (for bot integration)
router.get('/telegram-user/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    const db = getDatabase();
    const user = await db.collection('users').findOne({
      telegram_user_id: parseInt(telegramId)
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      success: true,
      id: user._id,
      email: user.email,
      username: user.username,
      telegram_username: user.telegram_username,
      auth_method: user.auth_method,
      registration_date: user.registration_date
    });
  } catch (error) {
    console.error('Get Telegram user error:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

// Link Telegram user to website
router.post('/telegram-link', async (req, res) => {
  try {
    const { telegram_user_id, telegram_username, first_name, last_name } = req.body;

    const db = getDatabase();
    
    // Check if user already exists
    let user = await db.collection('users').findOne({
      telegram_user_id: parseInt(telegram_user_id)
    });

    if (user) {
      return res.json({
        success: true,
        user_id: user._id,
        message: 'Пользователь уже существует'
      });
    }

    // Create new user from Telegram
    const newUser = {
      email: null,
      username: telegram_username || first_name || `user_${telegram_user_id}`,
      password: null,
      is_verified: true,
      auth_method: 'telegram',
      telegram_user_id: parseInt(telegram_user_id),
      telegram_username: telegram_username,
      first_name: first_name,
      last_name: last_name,
      registration_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);

    res.json({
      success: true,
      user_id: result.insertedId,
      message: 'Пользователь успешно создан'
    });
  } catch (error) {
    console.error('Telegram link error:', error);
    res.status(500).json({ error: 'Ошибка при связывании аккаунта' });
  }
});

// Confirm Telegram auth from bot
router.post('/telegram-confirm', async (req, res) => {
  try {
    const { auth_token, telegram_user_info } = req.body;

    // Update auth session
    const updated = await updateTelegramAuthSession(auth_token, {
      status: 'confirmed',
      telegram_user_info: telegram_user_info
    });

    if (updated) {
      res.json({
        success: true,
        message: 'Авторизация подтверждена'
      });
    } else {
      res.status(404).json({ error: 'Сессия не найдена' });
    }
  } catch (error) {
    console.error('Telegram confirm error:', error);
    res.status(500).json({ error: 'Ошибка подтверждения авторизации' });
  }
});

// Get user profile (protected route)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        registration_date: req.user.registration_date,
        auth_method: req.user.auth_method,
        telegram_username: req.user.telegram_username
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// Change password (protected route)
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Check if user has password (for Telegram users)
    if (req.user.auth_method === 'telegram' && !req.user.password) {
      return res.status(400).json({ error: 'Пользователи Telegram не могут изменить пароль' });
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'Новые пароли не совпадают' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
    }

    const db = getDatabase();
    const { ObjectId } = require('mongodb');

    // Get current user password
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.user._id) },
      {
        $set: {
          password: hashedNewPassword,
          updated_at: new Date()
        }
      }
    );

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Ошибка сервера при смене пароля' });
  }
});

// Logout (client-side token removal, but we can add token blacklisting if needed)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In a more complex app, you might want to blacklist the token
    res.json({ message: 'Успешный выход' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ошибка выхода' });
  }
});

module.exports = router;