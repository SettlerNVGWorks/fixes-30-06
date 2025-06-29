const cron = require('node-cron');
const RealMatchParser = require('./realMatchParser');
const { getDatabase } = require('../database_mongo');

class Scheduler {
  constructor() {
    this.matchParser = new RealMatchParser();
    this.setupSchedules();
  }

  setupSchedules() {
    // Обновление матчей каждый день в 12:00 (по серверному времени)
    cron.schedule('0 12 * * *', async () => {
      console.log('🕒 Запуск ежедневного обновления матчей в 12:00');
      await this.updateDailyMatches();
    }, {
      scheduled: true,
      timezone: "Europe/Moscow"
    });

    // Также можно добавить обновление в полночь для очистки старых матчей
    cron.schedule('0 0 * * *', async () => {
      console.log('🧹 Очистка старых матчей в полночь');
      await this.cleanupOldMatches();
    }, {
      scheduled: true,
      timezone: "Europe/Moscow"
    });

    console.log('✅ Scheduler запущен:');
    console.log('   📅 Обновление матчей: каждый день в 12:00 (МСК)');
    console.log('   🧹 Очистка старых матчей: каждый день в 00:00 (МСК)');
  }

  // Ежедневное обновление матчей
  async updateDailyMatches() {
    try {
      console.log('🔄 Начинаем обновление ежедневных матчей...');

      // Очищаем сегодняшние матчи для обновления
      const today = this.getTodayString();
      const db = getDatabase();
      await db.collection('matches').deleteMany({ match_date: today });
      console.log('🗑️ Удалены старые матчи на сегодня');

      // Очищаем кеш
      this.matchParser.clearCache();
      console.log('💾 Очищен кеш матчей');

      // Парсим новые актуальные матчи с реальных источников
      const newMatches = await this.matchParser.getTodayMatches();
      console.log(`📊 Спарсено ${newMatches.length} новых актуальных матчей`);

      // Сохраняем в базу данных
      await this.matchParser.saveMatchesToDatabase(newMatches);
      console.log('💾 Новые матчи сохранены в базе данных');

      // Обновляем статистику
      await this.updateStatistics();
      console.log('📈 Статистика обновлена');

      console.log('✅ Ежедневное обновление матчей завершено успешно');
    } catch (error) {
      console.error('❌ Ошибка при обновлении ежедневных матчей:', error);
    }
  }

  // Очистка старых матчей
  async cleanupOldMatches() {
    try {
      const db = getDatabase();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      await db.collection('matches').deleteMany({ 
        match_date: { $lt: yesterdayString } 
      });
      console.log('✅ Старые матчи очищены');
    } catch (error) {
      console.error('❌ Ошибка при очистке старых матчей:', error);
    }
  }

  // Обновление статистики
  async updateStatistics() {
    try {
      const db = getDatabase();
      
      // Небольшое случайное изменение статистики для реализма
      const statsChange = {
        total_predictions: Math.floor(Math.random() * 10) + 1, // +1 до +10
        success_rate_change: (Math.random() - 0.5) * 2, // -1% до +1%
        active_bettors_change: Math.floor(Math.random() * 50) - 25, // -25 до +25
        monthly_wins: Math.floor(Math.random() * 5) + 1 // +1 до +5
      };

      await db.collection('stats').updateOne(
        {},
        {
          $inc: {
            total_predictions: statsChange.total_predictions,
            active_bettors: statsChange.active_bettors_change,
            monthly_wins: statsChange.monthly_wins
          },
          $set: {
            success_rate: Math.max(75, Math.min(85, 
              (await db.collection('stats').findOne({}))?.success_rate + statsChange.success_rate_change || 82.3
            )),
            updated_at: new Date()
          }
        },
        { upsert: true }
      );

      console.log('📈 Статистика обновлена с изменениями:', statsChange);
    } catch (error) {
      console.error('❌ Ошибка при обновлении статистики:', error);
    }
  }

  // Получить сегодняшнюю дату в формате YYYY-MM-DD
  getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Ручное обновление матчей (для тестирования)
  async manualUpdate() {
    console.log('🔧 Ручное обновление матчей...');
    await this.updateDailyMatches();
  }

  // Показать следующие запланированные задачи
  getScheduleInfo() {
    return {
      dailyMatchUpdate: '12:00 МСК каждый день',
      oldMatchCleanup: '00:00 МСК каждый день',
      timezone: 'Europe/Moscow'
    };
  }
}

module.exports = Scheduler;