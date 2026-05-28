const express = require('express');
const router  = express.Router();
const axios   = require('axios');

router.post('/chat', async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    // Groq expects system message as first entry in messages array
    const groqMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ];

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:      'llama-3.1-8b-instant',
        max_tokens: 1000,
        messages:   groqMessages
      },
      {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content || 'No response generated.';
    res.json({ reply });

  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('AI route error:', errMsg);
    res.status(500).json({ error: errMsg || 'AI service unavailable' });
  }
});

module.exports = router;