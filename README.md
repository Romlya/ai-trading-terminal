# AI Trading Terminal

## Рабочий UI (production)
https://temporary-brisk-boron-9iooscz.vercel.app

## Возможности
- График Binance (klines + WS), ТФ, темы свечей
- SMC structure (BOS/CHoCH, FVG, OB) на canvas
- DOM, clusters, screener, watchlist, alerts
- AI-панель (setup / mtf / структура)
- **Live Trade**: Theme → API keys → Trade → Live ON

## Backend
`api/binance.js` — Vercel serverless, HMAC SHA256, testnet/mainnet.
Ключи только в localStorage, не на сервере.

## Как торговать (testnet)
1. https://testnet.binance.vision → API Management → создать ключ
2. Theme → вставить Key/Secret, Testnet ON → «Проверить аккаунт»
3. Trade → Live ON → Market/Limit

## Структура репо
- `index.html` — фронт (полный UI деплоится на Vercel)
- `api/binance.js` — proxy ордеров
- `styles.css` / `app.jsx` — разбиение (в работе)
- `package.json` / `vercel.json`

## Git → Vercel
Подключи репозиторий в Settings → Git проекта Vercel для авто-деплоя с `main`.
