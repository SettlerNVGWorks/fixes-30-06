#!/bin/bash

echo "🚀 Запуск Cloudflare туннеля (без паролей)..."
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

# Проверяем наличие cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Устанавливаем Cloudflare Tunnel..."
    # Скачиваем для Linux
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

echo "🌐 Запускаем Cloudflare туннель..."
echo "📝 URL появится ниже"
echo ""
echo "🔄 Нажмите Ctrl+C для остановки"
echo ""

# Запускаем туннель
cloudflared tunnel --url http://localhost:3000