import React, { useState, useRef, useEffect } from 'react';

// ==================== 상수 ====================
const VERSION = 'v1.1 · 2026.02.26';
const COUNSELOR_NAME = '마음따숩 김윤정 위클래스쌤';
const SCHOOL_NAME = '위클래스 상담소';
const SUMMARY_INTERVAL = 5;

const GRADES = ['1학년','2학년','3학년','4학년','5학년','6학년'];

const CATEGORIES = [
  { id: 1,  emoji: '😔', label: '우울·슬픔' },
  { id: 2,  emoji: '😰', label: '불안·걱정' },
  { id: 3,  emoji: '😤', label: '분노·짜증' },
  { id: 4,  emoji: '👫', label: '친구관계' },
  { id: 5,  emoji: '❤️', label: '이성교제' },
  { id: 6,  emoji: '👨‍👩‍👧', label: '가족갈등' },
  { id: 7,  emoji: '📚', label: '학업·성적' },
  { id: 8,  emoji: '🏫', label: '학교폭력' },
  { id: 9,  emoji: '📱', label: '스마트폰중독' },
  { id: 10, emoji: '🎮', label: '게임중독' },
  { id: 11, emoji: '🍽️', label: '식사문제' },
  { id: 12, emoji: '😎', label: '자아정체성' },
  { id: 13, emoji: '🤕', label: '신체증상' },
  { id: 14, emoji: '🆘', label: '자해·자살' },
  { id: 15, emoji: '🧠', label: 'ADHD·집중력' },
  { id: 16, emoji: '🚶', label: '진로·진학' },
  { id: 17, emoji: '💪', label: '자존감' },
  { id: 18, emoji: '😋', label: '외모·외형' },
  { id: 19, emoji: '🌀', label: '스트레스' },
  { id: 20, emoji: '💬', label: '기타고민' },
];

const RISK_KEYWORDS = {
  high: ['자살','죽고싶','죽을','자해','손목','약먹','뛰어내','목매','사라지고 싶','없어지고 싶'],
  medium: ['때리','폭력','협박','싸움','맞았','왕따','따돌림','괴롭'],
};

// ==================== 한국어 조사 처리 ====================
function hasFinalConsonant(str) {
  if (!str) return false;
  const code = str.charCodeAt(str.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

function josa(name, type) {
  const hasBatchim = hasFinalConsonant(name);
  switch(type) {
    case '이가': return name + (hasBatchim ? '이' : '가');
    case '은는': return name + (hasBatchim ? '은' : '는');
    case '을를': return name + (hasBatchim ? '을' : '를');
    case '아야': return name + (hasBatchim ? '아' : '야');
    case '이야': return name + (hasBatchim ? '이야' : '야');
    default: return name;
  }
}

// ==================== 랜덤 인사 10가지 ====================
function getGreeting(name) {
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;
  const timeOfDay = hour < 6 ? '새벽' : hour < 12 ? '아침' : hour < 14 ? '점심' : hour < 18 ? '오후' : hour < 21 ? '저녁' : '밤';
  const season = month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울';
  const seasonEmoji = { '봄': '🌸', '여름': '☀️', '가을': '🍂', '겨울': '❄️' };
  const timeEmoji = { '새벽': '🌙', '아침': '🌅', '점심': '🌞', '오후': '🌤️', '저녁': '🌇', '밤': '🌙' };
  const nameYa = josa(name, '아야');
  const nameEun = josa(name, '은는');
  const greetings = [
    `${timeEmoji[timeOfDay]} ${timeOfDay}이에요! ${nameYa}, 위클래스에 와줘서 정말 반가워요! 오늘 어떤 이야기를 나눠볼까요? 💙`,
    `${seasonEmoji[season]} ${season}이 되었네요! ${nameYa}, 안녕! 선생님은 ${nameEun} 기다리고 있었어요. 오늘 마음은 어때요? 🌟`,
    `반가워요, ${nameYa}! 💕 선생님한테 이야기하러 와줘서 고마워요. 무슨 이야기든 편하게 해도 돼요!`,
    `${nameYa}, 어서 와요! 😊 ${timeOfDay}에 선생님을 찾아와줬네요. 오늘 하루 어땠어요?`,
    `안녕, ${nameYa}! 🌈 선생님은 항상 여기 있어요. 오늘 어떤 마음으로 왔어요?`,
    `${nameYa}, 잘 왔어요! ✨ ${season}${seasonEmoji[season]}처럼 따뜻한 이야기 나눠봐요. 무슨 일이 있었나요?`,
    `어머, ${nameYa}! 💙 반가워요~ 선생님이랑 오늘 어떤 이야기 하고 싶어요?`,
    `${nameYa}, 안녕하세요! 🎀 용기 내서 와줘서 고마워요. 편하게 이야기해줘요~`,
    `${timeEmoji[timeOfDay]} ${nameYa}, ${timeOfDay}에 선생님 찾아와줬네요! 오늘 마음이 어떤지 들려줄래요? 💕`,
    `${nameYa}! 선생님이에요 😊 ${season}${seasonEmoji[season]}에 함께해서 좋아요. 오늘 어떤 이야기 들고 왔어요?`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// ==================== 유틸 함수 ====================
function getRiskLevel(text) {
  if (!text) return 'none';
  const t = text.toLowerCase();
  if (RISK_KEYWORDS.high.some(k => t.includes(k))) return 'high';
  if (RISK_KEYWORDS.medium.some(k => t.includes(k))) return 'medium';
  return 'none';
}

function simpleSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = a.split(/\s+/);
  const wordsB = new Set(b.split(/\s+/));
  const common = wordsA.filter(w => w.length > 1 && wordsB.has(w));
  return common.length / Math.max(wordsA.length, 1);
}

async function callAI(messages, task = 'chat') {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, task }),
    });
    const data = await res.json();
    return data.content || data.error || '응답을 받지 못했어요.';
  } catch {
    return '네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
  }
}

async function extractSlots(userText, history) {
  const prompt = `다음 상담 대화에서 슬롯을 JSON으로 추출해줘.
슬롯: event(사건), target(대상), place_time(장소/시간), emotion(감정단어들), want(원하는것), next_question(다음질문후보1개)
대화:${history.slice(-4).map(m=>`${m.role}: ${m.content}`).join('\n')}
학생 최근 발화: ${userText}
JSON만 출력:`;
  const result = await callAI([{ role: 'user', content: prompt }], 'nlu');
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch { return {}; }
}

async function generateRollingSummary(history, prevSummary) {
  const prompt = `이전 요약: ${prevSummary || '없음'}
최근 대화:
${history.slice(-10).map(m=>`${m.role==='user'?'학생':'상담사'}: ${m.content}`).join('\n')}
위 내용을 바탕으로 3줄 이내로 상담 요약을 업데이트해줘. 핵심 감정, 상황, 주요 키워드 포함.`;
  return await callAI([{ role: 'user', content: prompt }], 'summary');
}

function updateFactMemory(prev, slots) {
  const next = { ...prev };
  if (slots.target) next.related_people = [...new Set([...(next.related_people||[]), slots.target])];
  if (slots.event) next.timeline = [...(next.timeline||[]), slots.event].slice(-5);
  if (slots.emotion) next.emotions = [...new Set([...(next.emotions||[]), ...(Array.isArray(slots.emotion)?slots.emotion:[slots.emotion])])];
  if (slots.want) next.student_preference = slots.want;
  return next;
}

function buildSystemPrompt(category, grade, name, gender, turnCount, rollingSummary, factMemory, askedSlots, lastBotQ) {
  const stage = turnCount < 3 ? '초기(공감·탐색)' : turnCount < 8 ? '중기(구체화·개입)' : '후기(정리·자원연결)';
  const nameYa = josa(name, '아야');
  return `당신은 초등학교 위클래스 상담 선생님입니다. 절대로 AI나 챗봇이라고 밝히지 마세요.
학생 정보: ${grade} ${gender === 'male' ? '남학생' : '여학생'} "${name}" (${nameYa} 라고 불러주세요)
상담 주제: ${category.label} ${category.emoji}
현재 단계: ${stage} (${turnCount}번째 대화)
${rollingSummary ? `\n[지금까지 대화 요약]\n${rollingSummary}` : ''}
${factMemory && Object.keys(factMemory).length > 0 ? `\n[기억하고 있는 정보]\n- 관련 인물: ${factMemory.related_people?.join(', ')||'없음'}\n- 있었던 일: ${factMemory.timeline?.join(', ')||'없음'}\n- 감정: ${factMemory.emotions?.join(', ')||'없음'}\n- 원하는 것: ${factMemory.student_preference||'없음'}` : ''}
${askedSlots && askedSlots.length > 0 ? `\n[이미 파악한 정보]: ${askedSlots.join(', ')} (다시 묻지 마세요)` : ''}
${lastBotQ ? `\n[직전에 한 말]: ${lastBotQ} (비슷한 내용 반복 금지)` : ''}

[상담 원칙 - 반드시 지켜주세요]
1. 실제 사람 상담사처럼 자연스럽게 대화하세요. AI나 챗봇이라고 절대 밝히지 마세요
2. ${nameYa} 라고 이름을 자주 불러주며 친밀감을 형성하세요
3. 학생이 한 말을 그대로 받아쳐주세요 (예: "아, 그 친구가 그런 말을 했구나...")
4. 질문은 한 번에 하나만, 2~3문장으로 짧고 따뜻하게
5. 학생이 더 이야기하고 싶도록 공감 → 구체화 → 감정 반영 순서로 진행
6. 초등학생 눈높이 언어 사용 (어려운 말 금지)
7. 이미 파악한 내용은 다시 묻지 말고, 더 깊은 이야기로 발전시키세요
8. 대화가 자연스럽게 이어지도록 학생의 감정과 상황에 집중하세요`;
}

// ==================== 메인 컴포넌트 ====================
export default function App() {
  const [step, setStep] = useState('home');
  const [category, setCategory] = useState(null);
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [riskAlert, setRiskAlert] = useState(null);
  const [rollingSummary, setRollingSummary] = useState('');
  const [factMemory, setFactMemory] = useState({});
  const [askedSlots, setAskedSlots] = useState([]);
  const [lastBotQ, setLastBotQ] = useState('');
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleHeaderClick = () => {
    const count = headerClickCount + 1;
    setHeaderClickCount(count);
    if (count >= 3) setHeaderClickCount(0);
  };

  const startChat = async () => {
    setStep('chat');
    setLoading(true);
    const greeting = getGreeting(name);
    const greetingMsg = { role: 'assistant', content: greeting };
    setMessages([greetingMsg]);
    setLastBotQ(greeting);
    const systemPrompt = buildSystemPrompt(category, grade, name, gender, 0, '', {}, [], greeting);
    const initMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: greeting },
      { role: 'user', content: `네, 안녕하세요.` }
    ];
    const aiReply = await callAI(initMessages);
    const botMsg = { role: 'assistant', content: aiReply };
    setMessages([greetingMsg, botMsg]);
    setLastBotQ(aiReply);
    setLoading(false);
  };

  const processAndSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    const userMsg = { role: 'user', content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    const risk = getRiskLevel(userText);
    if (risk === 'high') {
      const nameYa = josa(name, '아야');
      const crisisMsg = {
        role: 'assistant',
        content: `${nameYa}, 지금 많이 힘들구나. 💙 선생님이 바로 도와줄게. 지금 당장 위클래스 선생님께 직접 이야기하거나, 청소년 위기상담 전화 **1388**로 전화해줘. 네가 정말 소중해.`
      };
      setMessages([...updatedMessages, crisisMsg]);
      setRiskAlert('high');
      setLoading(false);
      return;
    }
    if (risk === 'medium') setRiskAlert('medium');

    const slots = await extractSlots(userText, updatedMessages);
    const newFactMemory = updateFactMemory(factMemory, slots);
    setFactMemory(newFactMemory);

    const newAskedSlots = [...askedSlots];
    if (slots.event && !newAskedSlots.includes('event')) newAskedSlots.push('event');
    if (slots.target && !newAskedSlots.includes('target')) newAskedSlots.push('target');
    if (slots.emotion && !newAskedSlots.includes('emotion')) newAskedSlots.push('emotion');
    setAskedSlots(newAskedSlots);

    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    let currentSummary = rollingSummary;
    if (newTurnCount % SUMMARY_INTERVAL === 0) {
      currentSummary = await generateRollingSummary(updatedMessages, rollingSummary);
      setRollingSummary(currentSummary);
    }

    const systemPrompt = buildSystemPrompt(
      category, grade, name, gender, newTurnCount,
      currentSummary, newFactMemory, newAskedSlots, lastBotQ
    );

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...updatedMessages.slice(-20)
    ];

    let aiReply = await callAI(apiMessages);

    if (simpleSimilarity(aiReply, lastBotQ) > 0.6) {
      const retryMessages = [
        ...apiMessages,
        { role: 'user', content: '방금 한 말과 다른 방식으로 공감하거나 새로운 질문을 해줘.' }
      ];
      aiReply = await callAI(retryMessages);
    }

    const botMsg = { role: 'assistant', content: aiReply };
    setMessages([...updatedMessages, botMsg]);
    setLastBotQ(aiReply);
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      name, grade,
      category: category.label,
      user: userText,
      bot: aiReply,
      risk
    }]);
    setLoading(false);
  };

  const S = {
    wrap: { minHeight: '100vh', backgroundImage: 'url(/school_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.55)', zIndex: 0 },
    card: { position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.92)', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
    header: { background: 'linear-gradient(135deg,#ff8fab,#ffb3c6)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'center', cursor: 'pointer' },
    headerTitle: { fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 },
    headerSub: { fontSize: 13, color: '#fff8', margin: '4px 0 0' },
    categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, margin: '16px 0' },
    categoryBtn: { background: '#fff0f5', border: '2px solid #ffb3c6', borderRadius: 14, padding: '12px 4px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
    categoryEmoji: { fontSize: 30, display: 'block', marginBottom: 4 },
    categoryLabel: { fontSize: 11, color: '#d63384', fontWeight: 600 },
    gradeBtn: { background: '#fff0f5', border: '2px solid #ffb3c6', borderRadius: 12, padding: '12px 16px', margin: '6px', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#d63384' },
    input: { width: '100%', borderRadius: 12, border: '2px solid #ffb3c6', padding: '10px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
    sendBtn: { background: 'linear-gradient(135deg,#ff8fab,#d63384)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginLeft: 8 },
    userBubble: { background: 'linear-gradient(135deg,#ff8fab,#ffb3c6)', color: '#fff', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', maxWidth: '75%', marginLeft: 'auto', marginBottom: 8, fontSize: 14 },
    botBubble: { background: '#fff0f5', border: '1px solid #ffb3c6', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', maxWidth: '75%', marginBottom: 8, fontSize: 14, color: '#333' },
    riskHigh: { background: '#fff0f0', border: '2px solid #ff4444', borderRadius: 12, padding: 12, marginBottom: 12, color: '#cc0000', fontWeight: 700 },
    riskMedium: { background: '#fffbe6', border: '2px solid #ffaa00', borderRadius: 12, padding: 12, marginBottom: 12, color: '#886600' },
    factChip: { display: 'inline-block', background: '#e8f4fd', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#0066cc', margin: '2px' },
    footer: { textAlign: 'center', fontSize: 10, color: '#ccc', padding: '8px', marginTop: 'auto' },
  };

  if (step === 'home') return (
    <div style={S.wrap}>
      <div style={S.overlay} />
      <div style={S.card}>
        <div style={S.header} onClick={handleHeaderClick}>
          <p style={S.headerTitle}>💙 {SCHOOL_NAME}! 마음아 우리 같이 학교가자!</p>
          <p style={S.headerSub}>{COUNSELOR_NAME}</p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 15, color: '#555', marginBottom: 8 }}>
          안녕, 마음아! 위클래스에 온걸 환영해! 🌸<br />
          오늘은 선생님하고 어떤 이야기를 하고 싶을까?
        </p>
        <div style={S.categoryGrid}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} style={S.categoryBtn}
              onClick={() => { setCategory(cat); setStep('grade'); }}>
              <span style={S.categoryEmoji}>{cat.emoji}</span>
              <span style={S.categoryLabel}>{cat.label}</span>
            </button>
          ))}
        </div>
        <div style={S.footer}>💙 {SCHOOL_NAME} {VERSION}</div>
      </div>
    </div>
  );

  if (step === 'grade') return (
    <div style={S.wrap}>
      <div style={S.overlay} />
      <div style={S.card}>
        <div style={S.header}><p style={S.headerTitle}>몇 학년이에요? 📚</p></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
          {GRADES.map(g => (
            <button key={g} style={S.gradeBtn}
              onClick={() => { setGrade(g); setStep('name'); }}>
              {g}
            </button>
          ))}
        </div>
        <button onClick={() => setStep('home')} style={{ ...S.gradeBtn, background: '#f5f5f5', color: '#999', border: '2px solid #ddd' }}>← 뒤로</button>
      </div>
    </div>
  );

  if (step === 'name') return (
    <div style={S.wrap}>
      <div style={S.overlay} />
      <div style={S.card}>
        <div style={S.header}><p style={S.headerTitle}>이름이 뭐예요? 😊</p></div>
        <div style={{ margin: '20px 0' }}>
          <input style={S.input} placeholder="이름 또는 별명을 입력해요" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('gender')} />
          <button style={{ ...S.sendBtn, width: '100%', marginLeft: 0, marginTop: 12 }}
            onClick={() => name.trim() && setStep('gender')}>다음 →</button>
        </div>
        <button onClick={() => setStep('grade')} style={{ ...S.gradeBtn, background: '#f5f5f5', color: '#999', border: '2px solid #ddd' }}>← 뒤로</button>
      </div>
    </div>
  );

  if (step === 'gender') return (
    <div style={S.wrap}>
      <div style={S.overlay} />
      <div style={S.card}>
        <div style={S.header}><p style={S.headerTitle}>성별을 선택해요 💕</p></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '24px 0' }}>
          {[{ val: 'male', label: '👦 남학생' }, { val: 'female', label: '👧 여학생' }].map(({ val, label }) => (
            <button key={val} style={{ ...S.gradeBtn, fontSize: 18, padding: '16px 32px' }}
              onClick={() => { setGender(val); startChat(); }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setStep('name')} style={{ ...S.gradeBtn, background: '#f5f5f5', color: '#999', border: '2px solid #ddd' }}>← 뒤로</button>
      </div>
    </div>
  );

  if (step === 'chat') return (
    <div style={S.wrap}>
      <div style={S.overlay} />
      <div style={{ ...S.card, padding: 0, display: 'flex', flexDirection: 'column', height: '85vh' }}>
        <div style={{ ...S.header, borderRadius: '24px 24px 0 0', margin: 0, padding: '14px 20px' }} onClick={handleHeaderClick}>
          <p style={{ ...S.headerTitle, fontSize: 16 }}>💙 {SCHOOL_NAME} · {category?.label} {category?.emoji}</p>
          <p style={S.headerSub}>{name} · {grade} · {COUNSELOR_NAME}</p>
        </div>
        {riskAlert === 'high' && (
          <div style={S.riskHigh}>🚨 위기 상황이 감지되었습니다. 즉시 전문가에게 연결하세요! ☎️ 1388</div>
        )}
        {riskAlert === 'medium' && (
          <div style={S.riskMedium}>⚠️ 주의가 필요한 내용이 감지되었습니다.</div>
        )}
        {Object.keys(factMemory).length > 0 && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #ffb3c6' }}>
            {factMemory.related_people?.map((p, i) => <span key={i} style={S.factChip}>👤 {p}</span>)}
            {factMemory.emotions?.map((e, i) => <span key={i} style={S.factChip}>💭 {e}</span>)}
            {factMemory.student_preference && <span style={S.factChip}>🎯 {factMemory.student_preference}</span>}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {messages.map((m, i) => (
            <div key={i} style={m.role === 'user' ? S.userBubble : S.botBubble}>
              {m.content}
            </div>
          ))}
          {loading && <div style={S.botBubble}>💙 생각 중...</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #ffb3c6', display: 'flex' }}>
          <input style={S.input} placeholder="마음을 이야기해줘요 💬" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && processAndSend()} />
          <button style={S.sendBtn} onClick={processAndSend}>전송</button>
        </div>
      </div>
    </div>
  );

  return null;
}
