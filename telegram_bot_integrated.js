const { Telegraf, Markup } = require('telegraf');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

// Configuration
const BOT_TOKEN = '8129667007:AAFtjzNz7aD121Rem8Ya0fUZhmAfyvBfNg4';
const WEBSITE_API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 123456789; // Замените на ваш Telegram ID

const bot = new Telegraf(BOT_TOKEN);

// Store user data
const userData = new Map();

// Helper functions
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// API calls to website backend
const websiteAPI = {
  // Check if user exists by telegram_user_id
  async getUserByTelegramId(telegramId) {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/auth/telegram-user/${telegramId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Create or link Telegram user to website
  async linkTelegramUser(telegramId, telegramUsername, firstName, lastName) {
    try {
      const response = await axios.post(`${WEBSITE_API_URL}/auth/telegram-link`, {
        telegram_user_id: telegramId,
        telegram_username: telegramUsername,
        first_name: firstName,
        last_name: lastName
      });
      return response.data;
    } catch (error) {
      console.error('Error linking Telegram user:', error);
      return null;
    }
  },

  // Confirm website auth
  async confirmWebsiteAuth(authToken, telegramUserInfo) {
    try {
      const response = await axios.post(`${WEBSITE_API_URL}/auth/telegram-confirm`, {
        auth_token: authToken,
        telegram_user_info: telegramUserInfo
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming website auth:', error);
      return null;
    }
  }
};

// Main menu keyboard
const getMainMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🌐 Войти на сайт', 'website_login')],
    [Markup.button.callback('👤 Профиль', 'profile')],
    [Markup.button.callback('💳 Услуги', 'services')],
    [Markup.button.callback('🎯 Прогнозы', 'predictions')],
    [Markup.button.callback('💰 Баланс', 'balance')],
    [Markup.button.callback('👥 Рефералы', 'referrals')],
    [Markup.button.url('📱 Открыть сайт', process.env.FRONTEND_URL || 'http://localhost:3000')]
  ]);
};

// User profile menu
const getProfileKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Статистика', 'stats')],
    [Markup.button.callback('🔗 Связать с сайтом', 'link_website')],
    [Markup.button.callback('🔙 Назад', 'main_menu')]
  ]);
};

// Services menu
const getServicesKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎯 Ординар - 599₽', 'buy_single')],
    [Markup.button.callback('⚡ Двойник - 999₽', 'buy_double')],
    [Markup.button.callback('🚀 Экспресс - 1999₽', 'buy_express')],
    [Markup.button.callback('👑 VIP Канал', 'vip_plans')],
    [Markup.button.callback('🔙 Назад', 'main_menu')]
  ]);
};

// Initialize user data
const initializeUser = (ctx) => {
  const userId = ctx.from.id;
  if (!userData.has(userId)) {
    userData.set(userId, {
      balance: 0,
      referrals: 0,
      referrals_list: [],
      website_linked: false,
      website_user_id: null,
      registration_date: new Date(),
      referrer_id: null
    });
  }
  return userData.get(userId);
};

// Start command handler
bot.start(async (ctx) => {
  const user = initializeUser(ctx);
  const args = ctx.message.text.split(' ');
  
  // Handle referral
  if (args.length > 1) {
    const param = args[1];
    
    // Handle website auth
    if (param.startsWith('auth_')) {
      const authToken = param.replace('auth_', '');
      return await handleWebsiteAuth(ctx, authToken);
    }
    
    // Handle referral
    if (param.match(/^\d+$/)) {
      const referrerId = parseInt(param);
      if (referrerId !== ctx.from.id && !user.referrer_id) {
        user.referrer_id = referrerId;
        
        // Add bonus to referrer
        if (userData.has(referrerId)) {
          const referrer = userData.get(referrerId);
          referrer.balance += 100;
          referrer.referrals += 1;
          referrer.referrals_list.push(ctx.from.id);
          
          // Notify referrer
          try {
            await ctx.telegram.sendMessage(referrerId, 
              `🎉 Новый реферал! +100₽ на баланс\n👤 Пользователь: ${ctx.from.first_name}`
            );
          } catch (error) {
            console.log('Could not notify referrer');
          }
        }
      }
    }
  }

  // Check if user is linked to website
  const websiteUser = await websiteAPI.getUserByTelegramId(ctx.from.id);
  if (websiteUser) {
    user.website_linked = true;
    user.website_user_id = websiteUser.id;
  }

  const welcomeText = `🏆 Добро пожаловать в ПРОГНОЗЫ НА СПОРТ №1!

👋 Привет, ${ctx.from.first_name}!

🎯 Я ваш помощник для:
• Входа на сайт через Telegram
• Покупки прогнозов
• Управления балансом
• Реферальной программы

${user.website_linked ? '✅ Ваш аккаунт связан с сайтом' : '⚠️ Аккаунт не связан с сайтом'}

💰 Баланс: ${user.balance}₽
👥 Рефералы: ${user.referrals}

Выберите действие:`;

  await ctx.reply(welcomeText, getMainMenuKeyboard());
});

// Handle website authentication
const handleWebsiteAuth = async (ctx, authToken) => {
  try {
    const telegramUserInfo = {
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name
    };

    const result = await websiteAPI.confirmWebsiteAuth(authToken, telegramUserInfo);
    
    if (result && result.success) {
      const user = initializeUser(ctx);
      user.website_linked = true;
      user.website_user_id = result.user_id;

      await ctx.reply(
        `✅ Успешная авторизация на сайте!

🎉 Вы успешно вошли на сайт "Прогнозы на спорт №1"
🔗 Ваш Telegram аккаунт теперь связан с сайтом

Можете закрыть это окно и продолжить использование сайта.`,
        Markup.inlineKeyboard([
          [Markup.button.url('🌐 Перейти на сайт', process.env.FRONTEND_URL || 'http://localhost:3000')],
          [Markup.button.callback('🔙 Главное меню', 'main_menu')]
        ])
      );
    } else {
      await ctx.reply('❌ Ошибка авторизации. Попробуйте еще раз.');
    }
  } catch (error) {
    console.error('Website auth error:', error);
    await ctx.reply('❌ Ошибка авторизации. Попробуйте еще раз.');
  }
};

// Button handlers
bot.action('main_menu', async (ctx) => {
  const user = initializeUser(ctx);
  
  const menuText = `🏆 ГЛАВНОЕ МЕНЮ

💰 Баланс: ${user.balance}₽
👥 Рефералы: ${user.referrals}
${user.website_linked ? '✅ Связан с сайтом' : '⚠️ Не связан с сайтом'}

Выберите действие:`;

  await ctx.editMessageText(menuText, getMainMenuKeyboard());
});

bot.action('website_login', async (ctx) => {
  const loginText = `🌐 ВХОД НА САЙТ

Для входа на сайт через Telegram:

1️⃣ Откройте сайт
2️⃣ Нажмите "Войти через Telegram"
3️⃣ Подтвердите вход в этом боте

Или используйте прямую ссылку ниже:`;

  await ctx.editMessageText(loginText, 
    Markup.inlineKeyboard([
      [Markup.button.url('🌐 Открыть сайт', process.env.FRONTEND_URL || 'http://localhost:3000')],
      [Markup.button.callback('🔗 Связать аккаунт', 'link_website')],
      [Markup.button.callback('🔙 Назад', 'main_menu')]
    ])
  );
});

bot.action('link_website', async (ctx) => {
  const user = initializeUser(ctx);
  
  if (user.website_linked) {
    await ctx.editMessageText(
      '✅ Ваш аккаунт уже связан с сайтом!',
      Markup.inlineKeyboard([
        [Markup.button.url('🌐 Перейти на сайт', process.env.FRONTEND_URL || 'http://localhost:3000')],
        [Markup.button.callback('🔙 Назад', 'main_menu')]
      ])
    );
    return;
  }

  // Try to link automatically
  const result = await websiteAPI.linkTelegramUser(
    ctx.from.id,
    ctx.from.username,
    ctx.from.first_name,
    ctx.from.last_name
  );

  if (result && result.success) {
    user.website_linked = true;
    user.website_user_id = result.user_id;

    await ctx.editMessageText(
      `✅ Аккаунт успешно связан с сайтом!

🎉 Теперь вы можете:
• Входить на сайт через Telegram
• Синхронизировать данные
• Получать уведомления о прогнозах`,
      Markup.inlineKeyboard([
        [Markup.button.url('🌐 Перейти на сайт', process.env.FRONTEND_URL || 'http://localhost:3000')],
        [Markup.button.callback('🔙 Назад', 'main_menu')]
      ])
    );
  } else {
    await ctx.editMessageText(
      `🔗 Связывание аккаунта

Чтобы связать Telegram с сайтом:

1️⃣ Зарегистрируйтесь на сайте
2️⃣ Используйте "Войти через Telegram"
3️⃣ Подтвердите связь в этом боте

Или создайте новый аккаунт прямо сейчас:`,
      Markup.inlineKeyboard([
        [Markup.button.url('📝 Регистрация на сайте', process.env.FRONTEND_URL || 'http://localhost:3000')],
        [Markup.button.callback('🔙 Назад', 'main_menu')]
      ])
    );
  }
});

bot.action('profile', async (ctx) => {
  const user = initializeUser(ctx);
  
  const profileText = `👤 ВАШ ПРОФИЛЬ

🆔 ID: ${ctx.from.id}
👤 Имя: ${ctx.from.first_name}
📧 Username: ${ctx.from.username || 'Не указан'}

💰 Баланс: ${user.balance}₽
👥 Рефералы: ${user.referrals}
📅 Регистрация: ${user.registration_date.toLocaleDateString('ru-RU')}

${user.website_linked ? 
  '✅ Аккаунт связан с сайтом' : 
  '⚠️ Аккаунт не связан с сайтом'
}

📎 Ваша реферальная ссылка:
https://t.me/ByWin52Bot?start=${ctx.from.id}`;

  await ctx.editMessageText(profileText, getProfileKeyboard());
});

bot.action('services', async (ctx) => {
  const servicesText = `💳 НАШИ УСЛУГИ

🎯 ОРДИНАР — 599₽
Одиночный прогноз, коэффициент 1.8-2.2
Проходимость: 98%

⚡ ДВОЙНИК — 999₽  
Прогноз на два события, коэф. 1.99-2.5
Проходимость: 95%

🚀 ЭКСПРЕСС — 1999₽
Несколько событий, коэф. 3.5-6.5
Проходимость: 99%

👑 VIP КАНАЛ
Только уверенные события
• Неделя — 3500₽
• Месяц — 15000₽ 
• Год — 50000₽

Выберите услугу:`;

  await ctx.editMessageText(servicesText, getServicesKeyboard());
});

bot.action('balance', async (ctx) => {
  const user = initializeUser(ctx);
  
  const balanceText = `💰 ВАШ БАЛАНС

💳 Текущий баланс: ${user.balance}₽
💸 Потрачено: 0₽
💎 Заработано: ${user.referrals * 100}₽

📊 История операций:
${user.referrals > 0 ? `+${user.referrals * 100}₽ от рефералов` : 'Операций пока нет'}

💡 Как пополнить баланс:
• Пригласите друзей (+100₽ за каждого)
• Используйте криптобота на сайте
• Переводы через СБП`;

  await ctx.editMessageText(balanceText,
    Markup.inlineKeyboard([
      [Markup.button.callback('👥 Рефералы', 'referrals')],
      [Markup.button.url('💳 Пополнить на сайте', process.env.FRONTEND_URL || 'http://localhost:3000')],
      [Markup.button.callback('🔙 Назад', 'main_menu')]
    ])
  );
});

bot.action('referrals', async (ctx) => {
  const user = initializeUser(ctx);
  
  const referralText = `👥 РЕФЕРАЛЬНАЯ ПРОГРАММА

💰 Заработано: ${user.referrals * 100}₽
👤 Приглашено: ${user.referrals} человек

🎁 За каждого приглашенного: +100₽
🔗 Ваша ссылка:
https://t.me/ByWin52Bot?start=${ctx.from.id}

📋 Как это работает:
1. Поделитесь ссылкой с друзьями
2. Они переходят и запускают бота  
3. Вам начисляется 100₽
4. Деньги можно тратить на прогнозы

${user.referrals > 0 ? 
  `\n✅ Ваши рефералы: ${user.referrals_list.length} человек` : 
  '\n🎯 Пригласите первого друга!'
}`;

  await ctx.editMessageText(referralText,
    Markup.inlineKeyboard([
      [Markup.button.callback('💰 Баланс', 'balance')],
      [Markup.button.callback('🔙 Назад', 'main_menu')]
    ])
  );
});

// Purchase handlers
bot.action('buy_single', async (ctx) => {
  const user = initializeUser(ctx);
  
  if (user.balance >= 599) {
    user.balance -= 599;
    await ctx.editMessageText(
      `✅ Ординар приобретен!

🎯 Ваш прогноз будет отправлен в течение часа
💰 Списано: 599₽
💳 Остаток: ${user.balance}₽

📈 Ожидайте сообщение с прогнозом!`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Назад', 'main_menu')]
      ])
    );
    
    // Notify admin
    try {
      await ctx.telegram.sendMessage(ADMIN_ID, 
        `💳 Новая покупка: Ординар\n👤 ${ctx.from.first_name} (${ctx.from.id})\n💰 599₽`
      );
    } catch (error) {
      console.log('Could not notify admin');
    }
  } else {
    await ctx.editMessageText(
      `❌ Недостаточно средств

💰 Нужно: 599₽
💳 У вас: ${user.balance}₽
📊 Не хватает: ${599 - user.balance}₽

Пополните баланс:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('👥 Рефералы (+100₽)', 'referrals')],
        [Markup.button.url('💳 Пополнить', process.env.FRONTEND_URL || 'http://localhost:3000')],
        [Markup.button.callback('🔙 Назад', 'services')]
      ])
    );
  }
});

// Similar handlers for other purchases...
bot.action('buy_double', async (ctx) => {
  const user = initializeUser(ctx);
  
  if (user.balance >= 999) {
    user.balance -= 999;
    await ctx.editMessageText(`✅ Двойник приобретен!\n💰 Остаток: ${user.balance}₽`, 
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'main_menu')]]));
  } else {
    await ctx.editMessageText(`❌ Недостаточно средств (нужно 999₽)`, 
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'services')]]));
  }
});

bot.action('buy_express', async (ctx) => {
  const user = initializeUser(ctx);
  
  if (user.balance >= 1999) {
    user.balance -= 1999;
    await ctx.editMessageText(`✅ Экспресс приобретен!\n💰 Остаток: ${user.balance}₽`, 
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'main_menu')]]));
  } else {
    await ctx.editMessageText(`❌ Недостаточно средств (нужно 1999₽)`, 
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'services')]]));
  }
});

// Admin commands
bot.command('admin', async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    const adminText = `👑 АДМИН ПАНЕЛЬ

📊 Статистика:
👥 Пользователей: ${userData.size}
💰 Общий баланс: ${Array.from(userData.values()).reduce((sum, user) => sum + user.balance, 0)}₽

/broadcast - Рассылка
/stats - Статистика
/give [id] [amount] - Выдать баланс`;
    
    await ctx.reply(adminText);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте еще раз.');
});

// Start bot
console.log('🤖 Starting integrated Telegram bot...');
bot.launch();

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('✅ Integrated bot is running!');