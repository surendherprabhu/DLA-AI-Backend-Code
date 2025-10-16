// server.js
import express from 'express';
import cors from 'cors';

// Node 18+ has fetch built-in. If you run older Node, use node-fetch.
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY; // set this on your server

if(!OPENAI_KEY){
  console.warn('Warning: OPENAI_API_KEY not set. The /api/chat endpoint will fail until you set it as an environment variable.');
}

// Basic rate limiter in-memory (demo only)
const rateMap = new Map();
function rateLimit(ip){
  const now = Date.now();
  const window = 60*1000; // 1 minute
  const max = 60; // 60 requests per minute
  const entry = rateMap.get(ip) || { ts: now, count:0 };
  if(now - entry.ts > window){ entry.ts = now; entry.count = 1; }
  else { entry.count += 1; }
  rateMap.set(ip, entry);
  return entry.count <= max;
}

app.post('/api/chat', async (req, res) =>{
  try{
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if(!rateLimit(ip)) return res.status(429).send('Too many requests');

    const { message } = req.body;
    if(!message) return res.status(400).send('Missing message');

    // call OpenAI Chat Completions
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 500
      })
    });

    if(!resp.ok){
      const t = await resp.text();
      return res.status(resp.status).send(t);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || '';
    return res.json({ reply });
  }catch(err){
    console.error(err);
    return res.status(500).send('Internal server error');
  }
});

app.listen(PORT, ()=> console.log(`Server listening on port ${PORT}`));
