# BASELINE v1 — 2026-08-29

Stable working terminal. Improve only from this point.

## Live
https://ai-trading-terminal-romans-projects-b0ef5e65.vercel.app

## Included
- Lightweight Charts + Binance REST/WS
- Volume Profile on price scale edge
- SMC structure toggle
- Paper trading: market/limit, SL/TP drag, BE, partial, reverse
- Bottom nav: Chart / Markets / Watch / Trade / Settings
- Theme picker: Изумруд, Графит, Монохром, Сталь, Лаванда
- Mobile-first Lattice-style UI

## Deploy model
- `index.html` — gzip loader (fetches `d0.b64`…`d9.b64` from this repo raw)
- Chunks = gzip+base64 of full single-file app
- Rebuild: update app → gzip → split 2KB → push d*.b64 + bump `?v=` on loader
