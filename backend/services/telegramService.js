const axios = require('axios');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Generate Telegram login link
const generateTelegramLoginUrl = (authToken) => {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ByWin52Bot';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // Create deep link to start bot with auth token
  const telegramUrl = `https://t.me/${botUsername}?start=auth_${authToken}`;
  
  return telegramUrl;
};

// Send message to user via Telegram
const sendTelegramMessage = async (chatId, message) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send authentication confirmation message
const sendAuthConfirmation = async (chatId, username, authToken) => {
  const message = `
🔐 <b>Авторизация на сайте</b>

Привет! Вы хотите войти на сайт "Прогнозы на спорт №1" как <b>${username}</b>?

Нажмите кнопку ниже для подтверждения входа:

/confirm_auth_${authToken}

⏰ <i>Ссылка действительна 5 минут</i>
  `;
  
  return await sendTelegramMessage(chatId, message);
};

// Get user info from Telegram
const getTelegramUserInfo = async (userId) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/getChat`, {
      chat_id: userId
    });
    
    return {
      success: true,
      data: response.data.result
    };
  } catch (error) {
    console.error('Error getting Telegram user info:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Set webhook for bot
const setWebhook = async (webhookUrl) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/setWebhook`, {
      url: webhookUrl
    });
    
    console.log('✅ Telegram webhook set successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error setting Telegram webhook:', error);
    throw error;
  }
};

// Process webhook updates
const processWebhookUpdate = async (update) => {
  try {
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      const from = message.from;
      
      console.log(`📨 Received message from ${from.username || from.first_name}: ${text}`);
      
      // Handle /start command with auth token
      if (text && text.startsWith('/start auth_')) {
        const authToken = text.replace('/start auth_', '');
        return await handleAuthStart(chatId, from, authToken);
      }
      
      // Handle auth confirmation
      if (text && text.startsWith('/confirm_auth_')) {
        const authToken = text.replace('/confirm_auth_', '');
        return await handleAuthConfirmation(chatId, from, authToken);
      }
      
      // Handle other commands
      if (text === '/start') {
        await sendWelcomeMessage(chatId, from);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing webhook update:', error);
    return { success: false, error: error.message };
  }
};

// Handle auth start command
const handleAuthStart = async (chatId, from, authToken) => {
  const username = from.username || from.first_name;
  
  const message = `
🔐 <b>Авторизация на сайте</b>

Привет, ${username}! 

Подтвердите вход на сайт "Прогнозы на спорт №1":

Нажмите: /confirm_auth_${authToken}

⏰ <i>Ссылка действительна 5 минут</i>
  `;
  
  await sendTelegramMessage(chatId, message);
  
  return {
    success: true,
    chatId,
    username,
    authToken
  };
};

// Handle auth confirmation
const handleAuthConfirmation = async (chatId, from, authToken) => {
  // This will be handled by the main auth route
  // Just send confirmation message
  const message = `
✅ <b>Авторизация подтверждена!</b>

Вы успешно вошли на сайт. Можете закрыть Telegram и продолжить использование сайта.

🚀 Добро пожаловать в "Прогнозы на спорт №1"!
  `;
  
  await sendTelegramMessage(chatId, message);
  
  return {
    success: true,
    chatId,
    from,
    authToken,
    confirmed: true
  };
};

// Send welcome message
const sendWelcomeMessage = async (chatId, from) => {
  const username = from.username || from.first_name;
  
  const message = `
👋 <b>Добро пожаловать!</b>

Привет, ${username}! 

Я бот для авторизации на сайте "Прогнозы на спорт №1" 🏆

🔐 Для входа на сайт используйте кнопку "Войти через Telegram"
📈 Получайте лучшие спортивные прогнозы
⚾ Экспертная аналитика по бейсболу и хоккею

<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">🌐 Перейти на сайт</a>
  `;
  
  await sendTelegramMessage(chatId, message);
};

module.exports = {
  generateTelegramLoginUrl,
  sendTelegramMessage,
  sendAuthConfirmation,
  getTelegramUserInfo,
  setWebhook,
  processWebhookUpdate,
  handleAuthStart,
  handleAuthConfirmation,
  sendWelcomeMessage
};