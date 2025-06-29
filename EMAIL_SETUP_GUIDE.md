# НАСТРОЙКА GMAIL SMTP ДЛЯ EMAIL VERIFICATION

## Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект или выберите существующий
3. Включите Gmail API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Gmail API" и включите его

## Шаг 2: Создание OAuth2 Credentials

1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "OAuth 2.0 Client IDs"
3. Выберите "Desktop application"
4. Сохраните Client ID и Client Secret

## Шаг 3: Получение Refresh Token

1. Перейдите на https://developers.google.com/oauthplayground
2. В настройках (шестеренка) поставьте галку "Use your own OAuth credentials"
3. Введите ваши Client ID и Client Secret
4. В левой панели найдите "Gmail API v1" > выберите "https://mail.google.com"
5. Нажмите "Authorize APIs"
6. Войдите в ваш Gmail аккаунт
7. Нажмите "Exchange authorization code for tokens"
8. Скопируйте "Refresh token"

## Шаг 4: Обновление .env файла

Замените эти строки в /app/backend/.env:

```env
# Email Configuration (Gmail SMTP)
GMAIL_USER=ваш-email@gmail.com
GMAIL_CLIENT_ID=ваш-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=ваш-client-secret
GMAIL_REFRESH_TOKEN=ваш-refresh-token
```

## Альтернатива: SendGrid (проще, но лимит меньше)

1. Регистрация на https://sendgrid.com/
2. Создание API Key
3. Один файл для настройки

Какой способ вы предпочитаете?