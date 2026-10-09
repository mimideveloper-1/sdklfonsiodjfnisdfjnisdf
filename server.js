const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eclipse-main.surge.sh')
  .split(',').map(origin => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser health checks; browser calls must match the allowlist.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/chat', async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: 'The AI service is not configured yet.' });
  const messages = req.body && req.body.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 13) {
    return res.status(400).json({ error: 'Invalid message history.' });
  }
  const cleanMessages = [];
  for (const message of messages) {
    if (!message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      return res.status(400).json({ error: 'Invalid message format.' });
    }
    cleanMessages.push({ role: message.role, content: message.content.slice(0, 12000) });
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: cleanMessages,
        temperature: 0.7,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(45000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Groq API returned HTTP', upstream.status);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: data.error?.message || 'The AI provider could not complete the request.'
      });
    }
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== 'string') return res.status(502).json({ error: 'The AI provider returned an unexpected response.' });
    return res.json({ reply });
  } catch (error) {
    console.error('AI request failed:', error.name || 'Error');
    return res.status(502).json({ error: 'Could not reach the AI provider. Please try again.' });
  }
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'This website is not allowed to use the AI service.' });
  if (err instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON request.' });
  return res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Groq proxy listening on ${PORT}`));
