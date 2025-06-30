#!/bin/bash

echo "🚀 Запуск туннеля для тестирования сайта..."
echo ""

# Проверяем что сервисы запущены
echo "📡 Проверяем сервисы..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Frontend не запущен на порту 3000"
    echo "Запустите: sudo supervisorctl restart frontend"
    exit 1
fi

if ! curl -s http://localhost:8001/api/health > /dev/null; then
    echo "❌ Backend не запущен на порту 8001"  
    echo "Запустите: sudo supervisorctl restart backend"
    exit 1
fi

echo "✅ Все сервисы работают!"
echo ""

# Проверяем наличие localtunnel
if ! command -v lt &> /dev/null; then
    echo "📦 Устанавливаем LocalTunnel..."
    npm install -g localtunnel
fi

# Генерируем случайное имя для сайта
SITE_NAME="sports-test-$(date +%s)"

echo "🌐 Запускаем туннель..."
echo "📝 URL будет: https://${SITE_NAME}.loca.lt"
echo ""
echo "🔄 Нажмите Ctrl+C для остановки"
echo ""

# Запускаем туннель
lt --port 3000 --subdomain $SITE_NAME