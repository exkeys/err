// 백엔드 서버 예시 코드
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dayjs from 'dayjs';
import fetch from 'node-fetch';

if (!global.fetch) {
  global.fetch = fetch;
}
dotenv.config();

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/record', async (req, res) => {
  const { user_id, date, fatigue, notes } = req.body;
  const { error } = await supabase.from('records').upsert({ user_id, date, fatigue, notes });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 기간별 데이터 조회 (range 또는 from/to)
async function getDataByRange({ range, from, to }) {
  let fromDate, toDate;
  if (range) {
    const now = dayjs();
    if (range === 'daily') fromDate = now.startOf('day').format('YYYY-MM-DD');
    if (range === 'weekly') fromDate = now.startOf('week').format('YYYY-MM-DD');
    if (range === 'monthly') fromDate = now.startOf('month').format('YYYY-MM-DD');
    toDate = now.format('YYYY-MM-DD');
  } else {
    fromDate = from;
    toDate = to;
  }
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate);
    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }
    return data;
  } catch (e) {
    console.error('Supabase network or fetch error:', e);
    throw e;
  }
}


// GET/POST 모두 지원하는 /analyze 핸들러
async function analyzeHandler(req, res) {
  try {
    const { range, from, to } = req.method === 'GET' ? req.query : req.body;
    console.log(`🟢 /analyze ${req.method} 요청:`, req.method === 'GET' ? req.query : req.body);

    if (!range && (!from || !to)) {
      console.warn('❌ 요청 파라미터 부족:', req.query, req.body);
      return res.status(400).json({ error: 'range 또는 from/to 필요' });
    }

    // 날짜 범위 계산
    let fromDate = from, toDate = to;
    if (range) {
      const now = dayjs();
      if (range === 'daily') fromDate = now.startOf('day').format('YYYY-MM-DD');
      if (range === 'weekly') fromDate = now.startOf('week').format('YYYY-MM-DD');
      if (range === 'monthly') fromDate = now.startOf('month').format('YYYY-MM-DD');
      toDate = now.format('YYYY-MM-DD');
    }
    console.log(`📅 조회 범위: from=${fromDate}, to=${toDate}`);

    // Supabase 조회
    let data;
    try {
      const { data: dbData, error } = await supabase
        .from('records')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate);
      if (error) {
        console.error('❌ Supabase 조회 실패:', error);
        return res.status(500).json({ error: 'Supabase 조회 실패', details: error.message });
      }
      data = dbData;
      console.log('✅ Supabase 조회 결과:', data);
    } catch (supabaseErr) {
      console.error('❌ Supabase 호출 실패:', supabaseErr);
      return res.status(500).json({ error: 'Supabase 호출 실패', details: supabaseErr.message });
    }

    if (!data || data.length === 0) {
      console.log('⚠️ 분석할 데이터가 없음');
      return res.json({ result: '분석할 데이터가 없습니다.' });
    }

    // OpenAI 프롬프트 생성
    const formatted = data
      .map(row => `• ${row.date}: ${row.fatigue} (${row.notes || '메모 없음'})`)
      .join('\n');
    const prompt = `다음은 사용자의 감정 데이터입니다.\n${formatted}\n이 데이터를 분석하고, 3줄 요약으로 주요 패턴과 감정 상태를 알려주세요.`;
    console.log('📝 OpenAI 프롬프트:', prompt);

    // OpenAI 호출
    let aiResponse;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: '너는 감정 분석을 잘하는 상담사야.' },
          { role: 'user', content: prompt },
        ],
      });
      aiResponse = response.choices?.[0]?.message?.content || '분석 결과 없음';
      console.log('✅ OpenAI 응답 성공:', aiResponse);
    } catch (openaiErr) {
      console.error('❌ OpenAI 호출 실패:', openaiErr);
      return res.status(500).json({ error: 'OpenAI API 호출 실패', details: openaiErr.message });
    }

    res.json({ result: aiResponse });

  } catch (e) {
    console.error('❌ /analyze 내부 오류:', e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}

app.get('/analyze', analyzeHandler);
app.post('/analyze', analyzeHandler);

// /chat route (from backends)
import { v4 as uuidv4 } from 'uuid';

app.post('/chat', async (req, res) => {
  try {
    console.log('--- /chat route called ---');
    console.log('Request body:', req.body);
    const { message, user } = req.body;
    if (!message) {
      console.log('No message provided');
      return res.status(400).json({ error: 'No message provided' });
    }

    const messageId = uuidv4();
    console.log('Saving user message to Supabase:', { id: messageId, user, message });
    const saveResult = await supabase.from('chat_messages').insert({
      id: messageId,
      user,
      message
    });
    console.log('Supabase insert result:', saveResult);

    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Provide clear and concise responses.' },
        { role: 'user', content: message }
      ],
      max_tokens: 100,
      temperature: 0.5,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    console.log('AI response:', aiResponse);

    const aiSaveResult = await supabase.from('chat_messages').insert({
      id: uuidv4(),
      user: 'ai',
      message: aiResponse,
      parent_message_id: messageId
    });
    console.log('AI message saved to Supabase:', aiSaveResult);

    res.send(aiResponse);
    console.log('Response sent to frontend');
  } catch (error) {
    console.error('Error in /chat route:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Unified backend server running on http://0.0.0.0:${PORT}`);
});
