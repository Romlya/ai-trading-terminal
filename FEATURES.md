# Live Trade (готово в коде)

## UI
- **Theme**: API Key, Secret, Testnet toggle, кнопка «Проверить аккаунт», список балансов
- **Trade**: переключатель Live Binance ON/OFF, LIVE market/limit через `/api/binance`

## Деплой
Коннектор Vercel временно 403 — нужно переподключить.
После этого зальём полный `index.html` (~76KB) на production.

## Как пользоваться (после деплоя)
1. Theme → API Key / Secret
2. Testnet ON (рекомендуется)
3. «Проверить аккаунт»
4. Trade → Live ON → ордер

Ключи только в localStorage браузера.
