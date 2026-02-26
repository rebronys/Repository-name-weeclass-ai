import React, { useState, useEffect, useRef } from 'react';

const VERSION = 'v1.1 · 2026.02.26';
const COUNSELOR_NAME = '마음따숩 김윤정 위클래스쌤';
const SCHOOL_NAME = '위클래스 상담소';
const SUMMARY_INTERVAL = 5;

const GRADES = ['1학년','2학년','3학년','4학년','5학년','6학년'];

const CATEGORIES = [
  { id:1,  emoji:'😔', label:'우울·무기력'     },
  { id:2,  emoji:'😰', label:'불안·걱정'       },
  { id:3,  emoji:'😡', label:'분노·짜증'       },
  { id:4,  emoji:'👫', label:'친구관계'        },
  { id:5,  emoji:'👨‍👩‍👧', label:'가족문제'        },
  { id:6,  emoji:'📚', label:'학습·성적'       },
  { id:7,  emoji:'🏫', label:'학교생활'        },
  { id:8,  emoji:'🤝', label:'따돌림·괴롭힘'   },
  { id:9,  emoji:'📱', label:'스마트폰·게임'   },
  { id:10, emoji:'💤', label:'수면문제'        },
  { id:11, emoji:'🍽️', label:'식사문제'        },
  { id:12, emoji:'🤒', label:'신체증상'        },
  { id:13, emoji:'🔪', label:'자해·자살생각'   },
  { id:14, emoji:'💔', label:'이성·사랑'       },
  { id:15, emoji:'🌀', label:'정체성혼란'      },
  { id:16, emoji:'😶', label:'무기력·의욕없음' },
  { id:17, emoji:'🏠', label:'가출·방황'       },
  { id:18, emoji:'💸', label:'돈·물질문제'     },
  { id:19, emoji:'🌧️', label:'상실·슬픔'       },
  { id:20, emoji:'💬', label:'기타고민'        },
];

const RISK_KEYWORDS = {
  high:   ['죽고싶','자살','자해','죽어버릴','사라지고싶','목숨','끊고싶'],
  medium: ['너무힘들','아무도없','혼자','포기하고싶','도망가고싶','무섭','괴로워'],
};

function hasFinalConsonant(str) {
  const code = str.charCodeAt(str.length - 1) - 0xAC00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

function josa(name, type) {
  const last = hasFinalConsonant(name);
  const map = {
    '아/야':   last ? '아' : '야',
    '이/가':   last ? '이' : '가',
    '은/는':   last ? '은' : '는',
    '을/를':   last ? '을' : '를',
    '이랑/랑': last ? '이랑' : '랑',
  };
  return name + (map[type] || '');
}

function getGreeting(name) {
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;
  const season = month >= 3 && month <= 5 ? '봄' :
                 month >= 6 && month <= 8 ? '여름' :
                 month >= 9 && month <= 11 ? '가을' : '겨울';
  const timeLabel = hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁';

  const templates = [
    `${timeLabel}에 찾아와줘서 고마워요, ${josa(name,'아/야')} 😊 오늘 어떤 마음으로 왔나요?`,
    `반가워요, ${josa(name,'아/야')}! 이렇게 용기 내어 와줘서 정말 잘했어요 💙`,
    `${season}날에 ${josa(name,'이/가')} 와줬네요 🌿 오늘 무슨 일이 있었나요?`,
    `어서 와요, ${josa(name,'아/야')} ☀️ 오늘 기분은 어때요?`,
    `${josa(name,'아/야')}, 여기 와줘서 기뻐요 🌸 편하게 이야기해요!`,
    `안녕하세요, ${josa(name,'아/야')} 🌈 무슨 이야기를 하고 싶었나요?`,
    `${josa(name,'이/가')} 와줬군요! ${timeLabel}에도 힘냈네요 ⭐`,
    `${season}처럼 따뜻하게 맞아줄게요, ${josa(name,'아/야')} 🍀 오늘 어떤가요?`,
    `${josa(name,'아/야')}, 잘 왔어요 💛 지금 마음이 어때요?`,
    `오늘 ${timeLabel}에도 ${josa(name,'이/가')} 여기 찾아와줬네요 🤗 무슨 고민이 있나요?`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function getRiskLevel(text) {
  if (RISK_KEYWORDS.high.some(k => text.includes(k)))   return 'high';
  if (RISK_KEYWORDS.medium.some(k => text.includes(k))) return 'medium';
  return 'none';
}

function simpleSimilarity(a, b) {
  const sa = new Set(a.split(''));
  const sb = new Set(b.split(''));
  const inter = [...sa].filter(c => sb.has(c)).length;
  return inter / Math.max(sa.size, sb.size, 1);
}

async function callAI(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('API 오류');
  const data = await res.json();
  return data.reply || '잠시 후 다시 시도해주세요.';
}

async function extractSlots(userText, conversationHistory) {
  const prompt = `
다음 학생 발화에서 정보를 추출하세요. JSON으로만 답하세요.
대화 맥락: ${conversationHistory.slice(-4).map(m=>m.role+': '+m.content).join('\n')}
학생 발화: "${userText}"
추출 항목: {"subject":"관련인물(친구/부모/선생님/없음)","emotion":"감정단어","situation":"상황요약 1문장","severity":"1-5숫자"}
`;
  try {
    const r = await callAI([{ role:'user', content: prompt }]);
    const match = r.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch { return {}; }
}

async function generateRollingSummary(prevSummary, recentMessages) {
  const recent = recentMessages.slice(-6).map(m => `${m.role==='user'?'학생':'상담사'}: ${m.content}`).join('\n');
  const prompt = `
이전 요약: ${prevSummary || '없음'}
최근 대화:
${recent}
위 내용을 3줄 이내로 핵심만 요약하세요. 학생의 감정과 상황 중심으로.
`;
  try { return await callAI([{ role:'user', content: prompt }]); }
  catch { return prevSummary; }
}

function updateFactMemory(prev, slots) {
  const next = { ...prev };
  if (slots.subject && slots.subject !== '없음') next.subject = slots.subject;
  if (slots.emotion)   next.emotion   = slots.emotion;
  if (slots.situation) next.situation = slots.situation;
  if (slots.severity)  next.severity  = slots.severity;
  return next;
}

function buildSystemPrompt(state) {
  const { category, grade, name, gender, rollingSummary, factMemory, askedSlots, lastBotQ } = state;
  return `
당신은 ${SCHOOL_NAME}의 전문 상담사입니다. 이름은 "${COUNSELOR_NAME}"입니다.
학생 정보: ${grade} ${name}(${gender}), 고민 영역: ${category}

[상담 원칙]
1. 절대 AI라고 밝히지 마세요. 따뜻한 사람 상담사처럼 대화하세요.
2. 한 번에 하나의 질문만 하세요.
3. 학생의 말을 먼저 공감하고 반영한 뒤 질문하세요.
4. 짧고 자연스러운 문장을 사용하세요 (2~4문장).
5. 이전 질문과 비슷한 질문을 반복하지 마세요.
6. 학생이 주도적으로 이야기할 수 있도록 열린 질문을 활용하세요.

[현재 파악된 정보]
${factMemory.subject ? `- 관련인물: ${factMemory.subject}` : ''}
${factMemory.emotion ? `- 감정: ${factMemory.emotion}` : ''}
${factMemory.situation ? `- 상황: ${factMemory.situation}` : ''}
${factMemory.severity ? `- 심각도: ${factMemory.severity}/5` : ''}

[대화 요약]
${rollingSummary || '아직 없음'}

[직전 상담사 질문]
${lastBotQ || '없음'}

[아직 묻지 않은 항목]
${askedSlots.filter(s=>!factMemory[s]).join(', ') || '없음'}
`.trim();
}

export default function App() {
  const [step, setStep]               = useState('home');
  const [category, setCategory]       = useState('');
  const [grade, setGrade]             = useState('');
  const [name, setName]               = useState('');
  const [gender, setGender]           = useState('');
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [turnCount, setTurnCount]     = useState(0);
  const [riskAlert, setRiskAlert]     = useState('none');
  const [rollingSummary, setRollingSummary] = useState('');
  const [factMemory, setFactMemory]   = useState({});
  const [askedSlots, setAskedSlots]   = useState(['subject','emotion','situation','severity']);
  const [lastBotQ, setLastBotQ]       = useState('');
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [logs, setLogs]               = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleHeaderClick() {
    setHeaderClickCount(n => n + 1);
  }

  async function startChat(selectedGender) {
    setGender(selectedGender);
    setStep('chat');
    setLoading(true);
    const greeting = getGreeting(name);
    const systemPrompt = buildSystemPrompt({
      category, grade, name, gender: selectedGender,
      rollingSummary: '', factMemory: {}, askedSlots: ['subject','emotion','situation','severity'], lastBotQ: '',
    });
    try {
      const reply = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: greeting },
      ]);
      setMessages([
        { role: 'assistant', content: greeting },
        { role: 'assistant', content: reply },
      ]);
      setLastBotQ(reply);
    } catch {
      setMessages([{ role: 'assistant', content: greeting }]);
    }
    setLoading(false);
  }

  async function processAndSend() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');

    const risk = getRiskLevel(userText);
    setRiskAlert(risk);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    const newTurn = turnCount + 1;
    setTurnCount(newTurn);

    try {
      const slots = await extractSlots(userText, newMessages);
      const newMemory = updateFactMemory(factMemory, slots);
      setFactMemory(newMemory);

      let summary = rollingSummary;
      if (newTurn % SUMMARY_INTERVAL === 0) {
        summary = await generateRollingSummary(rollingSummary, newMessages);
        setRollingSummary(summary);
      }

      const systemPrompt = buildSystemPrompt({
        category, grade, name, gender,
        rollingSummary: summary, factMemory: newMemory,
        askedSlots, lastBotQ,
      });

      const reply = await callAI([
        { role: 'system', content: systemPrompt },
        ...newMessages,
      ]);

      if (simpleSimilarity(reply, lastBotQ) > 0.7) {
        const retryReply = await callAI([
          { role: 'system', content: systemPrompt + '\n\n이전과 다른 방식으로 질문하세요.' },
          ...newMessages,
        ]);
        setMessages(prev => [...prev, { role: 'assistant', content: retryReply }]);
        setLastBotQ(retryReply);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        setLastBotQ(reply);
      }

      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        name, grade, category,
        user: userText, bot: reply, risk,
      }]);

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요. 💙' }]);
    }
    setLoading(false);
  }

  const S = {
    wrap: { minHeight:'100vh', background:'linear-gradient(135deg,#e8f4fd 0%,#f0e8ff 100%)', display:'flex', justifyContent:'center', alignItems:'center', padding:'20px', fontFamily:'Noto Sans KR, sans-serif' },
    card: { background:'#fff', borderRadius:'24px', boxShadow:'0 8px 32px rgba(100,100,200,0.15)', width:'100%', maxWidth:'480px', overflow:'hidden' },
    header: { background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', padding:'20px 24px', cursor:'pointer', userSelect:'none' },
    headerTitle: { fontSize:'20px', fontWeight:700, margin:0 },
    headerSub: { fontSize:'13px', opacity:0.85, marginTop:'4px' },
    body: { padding:'24px' },
    label: { fontSize:'14px', fontWeight:600, color:'#555', marginBottom:'12px', display:'block' },
    grid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' },
    catBtn: { background:'#f8f0ff', border:'2px solid #e8d5ff', borderRadius:'12px', padding:'12px 4px', cursor:'pointer', textAlign:'center', transition:'all 0.2s' },
    catEmoji: { fontSize:'22px', display:'block' },
    catLabel: { fontSize:'11px', color:'#666', marginTop:'4px', lineHeight:1.2 },
    gradeGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' },
    gradeBtn: { background:'#f0f8ff', border:'2px solid #c8e4ff', borderRadius:'12px', padding:'14px 8px', cursor:'pointer', fontSize:'15px', fontWeight:600, color:'#4a6fa5', textAlign:'center' },
    input: { width:'100%', padding:'12px 16px', borderRadius:'12px', border:'2px solid #e0e0e0', fontSize:'15px', outline:'none', boxSizing:'border-box' },
    btn: { width:'100%', padding:'14px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', fontSize:'16px', fontWeight:700, cursor:'pointer', marginTop:'12px' },
    genderRow: { display:'flex', gap:'12px', marginTop:'8px' },
    genderBtn: { flex:1, padding:'14px', borderRadius:'12px', border:'2px solid #e0d5ff', background:'#f8f0ff', fontSize:'15px', fontWeight:600, cursor:'pointer', color:'#555' },
    chatWrap: { display:'flex', flexDirection:'column', height:'70vh' },
    msgList: { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
    userBubble: { alignSelf:'flex-end', background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', padding:'10px 16px', borderRadius:'18px 18px 4px 18px', maxWidth:'80%', fontSize:'14px', lineHeight:1.6 },
    botBubble: { alignSelf:'flex-start', background:'#f4f0ff', color:'#333', padding:'10px 16px', borderRadius:'18px 18px 18px 4px', maxWidth:'80%', fontSize:'14px', lineHeight:1.6 },
    riskHigh: { background:'#fff0f0', border:'2px solid #ff6b6b', borderRadius:'12px', padding:'12px 16px', margin:'8px 16px', fontSize:'13px', color:'#c0392b', fontWeight:600 },
    riskMed: { background:'#fffbe6', border:'2px solid #f1c40f', borderRadius:'12px', padding:'12px 16px', margin:'8px 16px', fontSize:'13px', color:'#7d6608' },
    factRow: { display:'flex', flexWrap:'wrap', gap:'6px', padding:'8px 16px' },
    factChip: { background:'#e8f4fd', borderRadius:'20px', padding:'4px 10px', fontSize:'12px', color:'#2980b9' },
    inputRow: { display:'flex', gap:'8px', padding:'12px 16px', borderTop:'1px solid #eee' },
    sendBtn: { padding:'10px 18px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', fontSize:'15px', fontWeight:700, cursor:'pointer' },
    footer: { textAlign:'center', fontSize:'12px', color:'#aaa', padding:'12px', borderTop:'1px solid #f0f0f0' },
  };

  if (step === 'home') return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.header} onClick={handleHeaderClick}>
          <p style={S.headerTitle}>💙 {SCHOOL_NAME}</p>
          <p style={S.headerSub}>{COUNSELOR_NAME}</p>
        </div>
        <div style={S.body}>
          <span style={S.label}>오늘 어떤 고민이 있나요?</span>
          <div style={S.grid}>
            {CATEGORIES.map(c => (
              <button key={c.id} style={S.catBtn} onClick={() => { setCategory(c.label); setStep('grade'); }}>
                <span style={S.catEmoji}>{c.emoji}</span>
                <span style={S.catLabel}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={S.footer}>💙 {SCHOOL_NAME} {VERSION}</div>
      </div>
    </div>
  );

  if (step === 'grade') return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.header}>
          <p style={S.headerTitle}>💙 학년을 선택해주세요</p>
        </div>
        <div style={S.body}>
          <div style={S.gradeGrid}>
            {GRADES.map(g => (
              <button key={g} style={S.gradeBtn} onClick={() => { setGrade(g); setStep('name'); }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (step === 'name') return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.header}>
          <p style={S.headerTitle}>💙 이름을 알려주세요</p>
        </div>
        <div style={S.body}>
          <input
            style={S.input}
            placeholder="이름을 입력하세요"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('gender')}
          />
          <button style={S.btn} onClick={() => name.trim() && setStep('gender')}>다음</button>
        </div>
      </div>
    </div>
  );

  if (step === 'gender') return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.header}>
          <p style={S.headerTitle}>💙 성별을 선택해주세요</p>
        </div>
        <div style={S.body}>
          <div style={S.genderRow}>
            <button style={S.genderBtn} onClick={() => startChat('남학생')}>👦 남학생</button>
            <button style={S.genderBtn} onClick={() => startChat('여학생')}>👧 여학생</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === 'chat') return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.header} onClick={handleHeaderClick}>
          <p style={S.headerTitle}>💙 {SCHOOL_NAME}</p>
          <p style={S.headerSub}>{grade} {name} · {category}</p>
        </div>

        {riskAlert === 'high' && (
          <div style={S.riskHigh}>🚨 위기 감지: 선생님께 즉시 도움을 요청하세요! (117, 1393)</div>
        )}
        {riskAlert === 'medium' && (
          <div style={S.riskMed}>💛 많이 힘들군요. 선생님이 함께 있을게요.</div>
        )}

        {Object.keys(factMemory).length > 0 && (
          <div style={S.factRow}>
            {factMemory.subject  && <span style={S.factChip}>👤 {factMemory.subject}</span>}
            {factMemory.emotion  && <span style={S.factChip}>💭 {factMemory.emotion}</span>}
            {factMemory.severity && <span style={S.factChip}>📊 심각도 {factMemory.severity}/5</span>}
          </div>
        )}

        <div style={S.chatWrap}>
          <div style={S.msgList}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? S.userBubble : S.botBubble}>
                {m.content}
              </div>
            ))}
            {loading && <div style={S.botBubble}>💭 생각 중...</div>}
            <div ref={bottomRef} />
          </div>
          <div style={S.inputRow}>
            <input
              style={{ ...S.input, marginTop: 0 }}
              placeholder="마음속 이야기를 적어보세요..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && processAndSend()}
            />
            <button style={S.sendBtn} onClick={processAndSend}>전송</button>
          </div>
        </div>
        <div style={S.footer}>💙 {SCHOOL_NAME} {VERSION}</div>
      </div>
    </div>
  );

  return null;
}
