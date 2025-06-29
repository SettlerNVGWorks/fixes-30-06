const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { getDatabase } = require('../database_mongo');
const authMiddleware = require('../middleware_mongo');

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

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { telegram_tag: cleanTelegramTag },
        { username: username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким Telegram или именем уже существует' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      telegram_tag: cleanTelegramTag,
      username: username,
      password: hashedPassword,
      registration_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    const user = { ...newUser, _id: result.insertedId };

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: user._id,
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
    const { telegram_tag, password } = req.body;

    // Validation
    if (!telegram_tag || !password) {
      return res.status(400).json({ error: 'Telegram тег и пароль обязательны' });
    }

    // Clean telegram tag
    const cleanTelegramTag = telegram_tag.startsWith('@') ? telegram_tag : `@${telegram_tag}`;

    const db = getDatabase();

    // Find user by telegram_tag
    const user = await db.collection('users').findOne({ telegram_tag: cleanTelegramTag });

    if (!user) {
      return res.status(401).json({ error: 'Неверный Telegram тег или пароль' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный Telegram тег или пароль' });
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
        id: req.user._id,
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