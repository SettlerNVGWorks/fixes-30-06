const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { pool } = require('../database');
const authMiddleware = require('../middleware');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { telegram_tag, username, password, confirmPassword } = req.body;

    // Validation
    if (!telegram_tag || !username || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Пароли не совпадают' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    // Clean telegram tag
    const cleanTelegramTag = telegram_tag.startsWith('@') ? telegram_tag : `@${telegram_tag}`;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE telegram_tag = $1 OR username = $2',
      [cleanTelegramTag, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким Telegram или именем уже существует' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (telegram_tag, username, password) VALUES ($1, $2, $3) RETURNING id, telegram_tag, username, registration_date',
      [cleanTelegramTag, username, hashedPassword]
    );

    const user = newUser.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: user.id,
        telegram_tag: user.telegram_tag,
        username: user.username,
        registration_date: user.registration_date
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, telegram_tag, username, password, registration_date FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    const user = userResult.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: user.id,
        telegram_tag: user.telegram_tag,
        username: user.username,
        registration_date: user.registration_date
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// Get user profile (protected route)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        telegram_tag: req.user.telegram_tag,
        username: req.user.username,
        registration_date: req.user.registration_date
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

    // Get current user password
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.id]
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