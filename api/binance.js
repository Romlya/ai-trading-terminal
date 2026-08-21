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
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { msg: text };
  }
  if (!r.ok) {
    const err = new Error(data.msg || data.message || 'HTTP ' + r.status);
    err.code = data.code;
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

function getKeys(req) {
  const key = (req.headers['x-api-key'] || '').trim();
  const secret = (req.headers['x-api-secret'] || '').trim();
  if (!key || !secret) throw new Error('Need API Key and Secret headers');
  return { key, secret };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const q = req.query || {};
    const action = body.action || q.action || 'account';
    const testnet = !!(body.testnet || q.testnet === '1' || q.testnet === 'true');
    const { key, secret } = getKeys(req);

    if (action === 'account') {
      const data = await binance('GET', '/api/v3/account', {}, key, secret, testnet);
      const balances = (data.balances || [])
        .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b) => ({
          asset: b.asset,
          free: parseFloat(b.free),
          locked: parseFloat(b.locked),
        }));
      res.status(200).json({
        ok: true,
        canTrade: data.canTrade,
        balances,
        updateTime: data.updateTime,
      });
      return;
    }

    if (action === 'openOrders') {
      const symbol = (body.symbol || q.symbol || '').toUpperCase();
      const params = symbol ? { symbol } : {};
      const data = await binance('GET', '/api/v3/openOrders', params, key, secret, testnet);
      res.status(200).json({ ok: true, orders: data });
      return;
    }

    if (action === 'order' && req.method === 'POST') {
      const symbol = String(body.symbol || '').toUpperCase();
      const side = String(body.side || '').toUpperCase();
      const type = String(body.type || 'MARKET').toUpperCase();
      const quantity = body.quantity;
      if (!symbol || !side || !quantity) {
        res.status(400).json({ ok: false, error: 'symbol, side, quantity required' });
        return;
      }
      const params = { symbol, side, type, quantity: String(quantity) };
      if (type === 'LIMIT') {
        if (!body.price) {
          res.status(400).json({ ok: false, error: 'price required for LIMIT' });
          return;
        }
        params.price = String(body.price);
        params.timeInForce = body.timeInForce || 'GTC';
      }
      const data = await binance('POST', '/api/v3/order', params, key, secret, testnet);
      res.status(200).json({ ok: true, order: data });
      return;
    }

    if (action === 'cancel' && (req.method === 'POST' || req.method === 'DELETE')) {
      const symbol = String(body.symbol || q.symbol || '').toUpperCase();
      const orderId = body.orderId || q.orderId;
      if (!symbol || !orderId) {
        res.status(400).json({ ok: false, error: 'symbol and orderId required' });
        return;
      }
      const data = await binance(
        'DELETE',
        '/api/v3/order',
        { symbol, orderId: String(orderId) },
        key,
        secret,
        testnet
      );
      res.status(200).json({ ok: true, order: data });
      return;
    }

    if (action === 'ping') {
      res.status(200).json({ ok: true, testnet });
      return;
    }

    res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    res.status(e.status || 500).json({
      ok: false,
      error: e.message || String(e),
      code: e.code,
      data: e.data,
    });
  }
};
