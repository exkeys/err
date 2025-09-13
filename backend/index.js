// Backend Server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error(' Supabase environment variables not set');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error(' OpenAI API key not set');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Express app setup
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'API server is running',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Record endpoint
app.post('/record', async (req, res) => {
  try {
    const { user_id, date, fatigue, notes } = req.body;
    
    if (!user_id || !date || !fatigue) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'date', 'fatigue']
      });
    }

    if (fatigue < 1 || fatigue > 5) {
      return res.status(400).json({
        error: 'Fatigue must be between 1-5'
      });
    }

    const { data, error } = await supabase
      .from('records')
      .upsert({ user_id, date, fatigue, notes });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Analysis endpoint
async function analyzeHandler(req, res) {
  try {
    const { range, from, to } = req.method === 'GET' ? req.query : req.body;

    if (!range && (!from || !to)) {
      return res.status(400).json({ 
        error: 'Missing range or from/to parameters',
        examples: [
          { range: 'daily' },
          { from: '2025-09-01', to: '2025-09-07' }
        ]
      });
    }

    let fromDate, toDate;
    if (range) {
      const now = dayjs();
      switch (range) {
        case 'daily':
          fromDate = now.startOf('day').format('YYYY-MM-DD');
          toDate = now.format('YYYY-MM-DD');
          break;
        case 'weekly':
          fromDate = now.startOf('week').format('YYYY-MM-DD');
          toDate = now.format('YYYY-MM-DD');
          break;
        case 'monthly':
          fromDate = now.startOf('month').format('YYYY-MM-DD');
          toDate = now.format('YYYY-MM-DD');
          break;
        default:
          return res.status(400).json({ 
            error: 'Invalid range value',
            allowed: ['daily', 'weekly', 'monthly']
          });
      }
    } else {
      fromDate = from;
      toDate = to;
    }

    const { data, error } = await supabase
      .from('records')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.json({ 
        result: 'No data found for the specified period. Please record some entries first.'
      });
    }

    const formatted = data
      .map(row => {
        const fatigueText = ['Very Bad', 'Bad', 'Okay', 'Good', 'Very Good'][row.fatigue - 1] || row.fatigue;
        return ` ${row.date}: Condition ${fatigueText} (${row.notes || 'No notes'})`;
      })
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are an empathetic counselor who specializes in emotional analysis. Understand user emotions and provide constructive advice.'
        },
        { 
          role: 'user', 
          content: `Here is the user's condition data:\n${formatted}\n\nPlease provide a comprehensive analysis including:\n1. Overall patterns\n2. Notable changes or trends\n3. Suggestions for improvement\n\nUse a warm and friendly tone, summarize in 3-4 sentences.`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices?.[0]?.message?.content || 'Unable to generate analysis';
    res.json({ result: aiResponse });

  } catch (error) {
    res.status(500).json({ 
      error: 'Analysis error',
      details: error.message 
    });
  }
}

app.get('/analyze', analyzeHandler);
app.post('/analyze', analyzeHandler);

// Chatbot endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, user = 'test_user' } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messageId = uuidv4();
    await supabase.from('chat_messages').insert({
      id: messageId,
      user,
      message: message.trim()
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are an AI assistant specializing in emotional care. Show empathy and engage warmly with users. Provide advice on emotional recording, stress management, and mental health.'
        },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: 0.8
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I cannot generate a response';

    await supabase.from('chat_messages').insert({
      id: uuidv4(),
      user: 'ai',
      message: aiResponse,
      parent_message_id: messageId
    });

    res.send(aiResponse);

  } catch (error) {
    res.status(500).json({ 
      error: 'Chatbot error',
      details: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /health',
      'POST /record',
      'GET|POST /analyze',
      'POST /chat'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET  / (Server status)');
  console.log('- GET  /health (Health check)');
  console.log('- POST /record (Save record)');
  console.log('- GET|POST /analyze (Analyze records)');
  console.log('- POST /chat (Chatbot)');
});
