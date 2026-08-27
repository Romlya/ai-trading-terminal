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
    const msg = (data && (data.msg || data.message)) || text || r.statusText;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action || 'ping';
    const testnet = !!body.testnet;
    const apiKey = req.headers['x-api-key'] || body.apiKey || '';
    const apiSecret = req.headers['x-api-secret'] || body.apiSecret || '';

    if (action === 'ping') {
      return res.status(200).json({ ok: true, action: 'ping' });
    }

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ ok: false, error: 'API Key and Secret required' });
    }

    if (action === 'account') {
      const data = await binance('GET', '/api/v3/account', {}, apiKey, apiSecret, testnet);
      const balances = (data.balances || []).filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
      return res.status(200).json({
        ok: true,
        canTrade: data.canTrade,
        balances: balances.map((b) => ({ asset: b.asset, free: b.free, locked: b.locked })),
      });
    }

    if (action === 'openOrders') {
      const data = await binance('GET', '/api/v3/openOrders', { symbol: body.symbol }, apiKey, apiSecret, testnet);
      return res.status(200).json({ ok: true, orders: data });
    }

    if (action === 'order') {
      const params = {
        symbol: body.symbol,
        side: body.side,
        type: body.type,
        quantity: body.quantity,
      };
      if (body.type === 'LIMIT') {
        params.price = body.price;
        params.timeInForce = body.timeInForce || 'GTC';
      }
      if (body.type === 'STOP_LOSS' || body.type === 'STOP_LOSS_LIMIT') {
        params.stopPrice = body.stopPrice || body.price;
        if (body.type === 'STOP_LOSS_LIMIT') {
          params.price = body.price;
          params.timeInForce = body.timeInForce || 'GTC';
        }
      }
      const data = await binance('POST', '/api/v3/order', params, apiKey, apiSecret, testnet);
      return res.status(200).json({ ok: true, order: data });
    }

    if (action === 'cancel') {
      const data = await binance('DELETE', '/api/v3/order', {
        symbol: body.symbol,
        orderId: body.orderId,
      }, apiKey, apiSecret, testnet);
      return res.status(200).json({ ok: true, order: data });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message || String(e) });
  }
};
