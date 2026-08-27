const crypto = require('crypto');

const BASES = {
  spot: 'https://api.binance.com',
  testnet: 'https://testnet.binance.vision',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-KEY, X-API-SECRET');
}

function sign(query, secret) {
  return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

async function binance(method, path, params, apiKey, apiSecret, testnet) {
  const base = testnet ? BASES.testnet : BASES.spot;
  const p = Object.assign({}, params || {}, { timestamp: Date.now(), recvWindow: 10000 });
  const qs = Object.keys(p)
    .sort()
    .map((k) => k + '=' + encodeURIComponent(p[k]))
    .join('&');
  const signature = sign(qs, apiSecret);
  const url = base + path + '?' + qs + '&signature=' + signature;
  const r = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
  if (!r.ok) {
    const err = (data && (data.msg || data.message)) || text || r.statusText;
    throw new Error(err);
  }
  return data;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = req.headers['x-api-key'] || '';
  const apiSecret = req.headers['x-api-secret'] || '';
  let body = {};
  try {
    if (typeof req.body === 'string') body = JSON.parse(req.body || '{}');
    else body = req.body || {};
  } catch (e) {}

  const action = body.action || req.query.action || 'ping';
  const testnet = !!(body.testnet || req.query.testnet === '1' || req.query.testnet === 'true');

  if (action === 'ping') {
    return res.status(200).json({ ok: true, testnet });
  }

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ ok: false, error: 'Missing X-API-KEY or X-API-SECRET headers' });
  }

  try {
    if (action === 'account') {
      const data = await binance('GET', '/api/v3/account', {}, apiKey, apiSecret, testnet);
      const balances = (data.balances || []).filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
      return res.status(200).json({
        ok: true,
        canTrade: data.canTrade,
        canWithdraw: data.canWithdraw,
        balances: balances.map((b) => ({ asset: b.asset, free: b.free, locked: b.locked })),
      });
    }

    if (action === 'openOrders') {
      const symbol = body.symbol || req.query.symbol;
      const params = symbol ? { symbol } : {};
      const data = await binance('GET', '/api/v3/openOrders', params, apiKey, apiSecret, testnet);
      return res.status(200).json({ ok: true, orders: data });
    }

    if (action === 'order') {
      const { symbol, side, type, quantity, price, timeInForce } = body;
      if (!symbol || !side || !type || !quantity) {
        return res.status(400).json({ ok: false, error: 'symbol, side, type, quantity required' });
      }
      const params = {
        symbol: String(symbol).toUpperCase(),
        side: String(side).toUpperCase(),
        type: String(type).toUpperCase(),
        quantity: String(quantity),
      };
      if (type.toUpperCase() === 'LIMIT') {
        if (!price) return res.status(400).json({ ok: false, error: 'price required for LIMIT' });
        params.price = String(price);
        params.timeInForce = timeInForce || 'GTC';
      }
      const data = await binance('POST', '/api/v3/order', params, apiKey, apiSecret, testnet);
      return res.status(200).json({ ok: true, order: data });
    }

    if (action === 'cancel') {
      const { symbol, orderId } = body;
      if (!symbol || !orderId) {
        return res.status(400).json({ ok: false, error: 'symbol and orderId required' });
      }
      const data = await binance('DELETE', '/api/v3/order', { symbol: String(symbol).toUpperCase(), orderId: String(orderId) }, apiKey, apiSecret, testnet);
      return res.status(200).json({ ok: true, order: data });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
