export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { messages, task } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' });

  try {
    const systemMsg   = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const contents = chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (!contents.length) contents.push({ role:'user', parts:[{ text:'안녕' }] });
    while (contents.length && contents[contents.length-1].role === 'model') contents.pop();

    // task별 파라미터 조정
    const isNLU     = task === 'nlu';
    const isSummary = task === 'summary';

    const requestBody = {
      contents,
      generationConfig: {
        temperature:     isNLU || isSummary ? 0.2 : 0.88,
        maxOutputTokens: isNLU ? 300 : isSummary ? 400 : 500,
        topP: 0.95, topK: 40
      },
      ...(systemMsg && { system_instruction: { parts:[{ text: systemMsg.content }] } })
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      return res.status(200).json({ choices:[{ message:{ content:'선생님이 잠깐 자리를 비웠어요. 다시 말해줄 수 있어? 😊' } }] });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(200).json({ choices:[{ message:{ content:'선생님이 잠깐 생각 중이에요. 다시 얘기해줄래? 💙' } }] });
    }

    return res.status(200).json({ choices:[{ message:{ content: text } }] });

  } catch (error) {
    console.error('서버 오류:', error.message);
    return res.status(200).json({ choices:[{ message:{ content:'선생님이 잠깐 자리를 비웠어요. 조금 후에 다시 이야기해줄 수 있어? 😊' } }] });
  }
}
