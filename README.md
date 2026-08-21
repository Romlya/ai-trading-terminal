# AI Trading Terminal

Торговый терминал: графики, SMC structure, DOM, clusters, screener, AI-ассистент, Binance REST/WS + signed order proxy.

## Структура

- `index.html` — фронтенд
- `api/binance.js` — Vercel serverless (подпись ордеров Binance)
- `package.json` / `vercel.json` — деплой

## Деплой на Vercel

1. Import Git repo в Vercel
2. Deploy → static + `/api/binance`
3. Каждый push в `main` обновляет production

## API keys

Вкладка **Theme** → API Key + Secret (только localStorage).
Тесты: [Binance Testnet](https://testnet.binance.vision) → API Management.

## Live trading

1. Theme → ключи + Testnet ON
2. Проверить аккаунт
3. Trade → Live ON → ордера через `/api/binance`
