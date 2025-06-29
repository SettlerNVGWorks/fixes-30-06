const express = require('express');
const { updateTelegramAuthSession, getTelegramAuthSession } = require('../database_mongo');
const { processWebhookUpdate } = require('../services/telegramService');

const router = express.Router();

// Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // Process webhook update
    const result = await processWebhookUpdate(update);
    
    if (result.success && result.authToken) {
      // Update auth session with Telegram info
      await updateTelegramAuthSession(result.authToken, {
        status: result.confirmed ? 'confirmed' : 'pending',
        telegram_chat_id: result.chatId,
        telegram_user_info: result.from
      });
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
});

// Get webhook info
router.get('/webhook-info', async (req, res) => {
  try {
    const axios = require('axios');
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    
    const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({ error: 'Failed to get webhook info' });
  }
});

// Set webhook (for development/setup)
router.post('/set-webhook', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
    
    const { setWebhook } = require('../services/telegramService');
    const result = await setWebhook(url);
    
    res.json(result);
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

module.exports = router;