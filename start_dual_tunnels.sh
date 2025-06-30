#!/bin/bash

echo "🚀 Запуск ДВУХ туннелей для полной работы сайта..."
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

# Генерируем уникальные имена
TIMESTAMP=$(date +%s)
FRONTEND_NAME="frontend-${TIMESTAMP}"
BACKEND_NAME="backend-${TIMESTAMP}"

echo "🌐 Запускаем туннель для BACKEND..."
echo "📝 Backend URL будет: https://${BACKEND_NAME}.loca.lt"

# Запускаем backend туннель в фоне
lt --port 8001 --subdomain $BACKEND_NAME > /tmp/backend_tunnel.log 2>&1 &
BACKEND_PID=$!

# Ждем пока backend туннель запустится
sleep 5

# Получаем URL backend
BACKEND_URL="https://${BACKEND_NAME}.loca.lt"

echo "✅ Backend туннель запущен: $BACKEND_URL"
echo ""

# Обновляем .env файл frontend с backend URL
echo "🔧 Обновляем конфигурацию frontend..."
sed -i "s|REACT_APP_BACKEND_URL_NGROK=.*|REACT_APP_BACKEND_URL_NGROK=${BACKEND_URL}|" /app/frontend/.env

# Перезапускаем frontend
echo "🔄 Перезапускаем frontend..."
sudo supervisorctl restart frontend

echo "⏳ Ждем запуска frontend..."
sleep 15

echo ""
echo "🌐 Запускаем туннель для FRONTEND..."
echo "📝 Frontend URL будет: https://${FRONTEND_NAME}.loca.lt"
echo ""
echo "🎉 ВАШ САЙТ БУДЕТ ДОСТУПЕН ПО АДРЕСУ:"
echo "   👉 https://${FRONTEND_NAME}.loca.lt"
echo ""
echo "🔄 Нажмите Ctrl+C для остановки всех туннелей"
echo ""

# Функция очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Останавливаем туннели..."
    kill $BACKEND_PID 2>/dev/null
    echo "✅ Туннели остановлены"
    exit 0
}

# Ловим сигнал прерывания
trap cleanup INT

# Запускаем frontend туннель
lt --port 3000 --subdomain $FRONTEND_NAME