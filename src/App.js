import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════
   상수 / 설정
═══════════════════════════════════════════ */
const COUNSELOR_NAME = '마음따숩 김윤정 위클래스쌤';
const SCHOOL_NAME    = '위클래스 상담소';
const ADMIN_PW       = 'weeclass2024';
const SUMMARY_EVERY  = 5;   // N턴마다 Rolling Summary 갱신

const GRADES = ['1학년','2학년','3학년','교직원'];

const CATEGORIES = [
  { id:1,  emoji:'😔', label:'우울·슬픔' },
  { id:2,  emoji:'😰', label:'불안·걱정' },
  { id:3,  emoji:'😤', label:'분노·짜증' },
  { id:4,  emoji:'👫', label:'친구관계' },
  { id:5,  emoji:'💔', label:'이성교제' },
  { id:6,  emoji:'👨‍👩‍👧', label:'가족갈등' },
  { id:7,  emoji:'📚', label:'학업·성적' },
  { id:8,  emoji:'🏫', label:'학교폭력' },
  { id:9,  emoji:'📱', label:'스마트폰중독' },
  { id:10, emoji:'🎮', label:'게임중독' },
  { id:11, emoji:'🍽️', label:'섭식문제' },
  { id:12, emoji:'😴', label:'수면문제' },
  { id:13, emoji:'🤒', label:'신체증상' },
  { id:14, emoji:'🆘', label:'자해·자살' },
  { id:15, emoji:'🧠', label:'ADHD·집중력' },
  { id:16, emoji:'🏃', label:'진로·진학' },
  { id:17, emoji:'💪', label:'자존감' },
  { id:18, emoji:'😶', label:'외로움·고립' },
  { id:19, emoji:'🌀', label:'스트레스' },
  { id:20, emoji:'💬', label:'기타고민' },
];

const RISK_KEYWORDS = {
  high:   ['자살','죽고싶','죽을','자해','손목','약먹','뛰어내','목매','사라지고 싶','없어지고 싶'],
  medium: ['때리','폭력','협박','싸움','맞았','왕따','따돌림','괴롭'],
};

/* ═══════════════════════════════════════════
   유틸 함수
═══════════════════════════════════════════ */
function getRiskLevel(text) {
  if (!text) return 'low';
  const t = text.toLowerCase();
  if (RISK_KEYWORDS.high.some(k => t.includes(k)))   return 'high';
  if (RISK_KEYWORDS.medium.some(k => t.includes(k))) return 'medium';
  return 'low';
}

/** 두 문장의 단순 유사도(공통 단어 비율) */
function simpleSimilarity(a, b) {
  if (!a || !b) return 0;
  const setA = new Set(a.replace(/[^가-힣a-z0-9\s]/gi,'').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[^가-힣a-z0-9\s]/gi,'').split(/\s+/).filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  const inter = [...setA].filter(x => setB.has(x)).length;
  return inter / Math.max(setA.size, setB.size);
}

/* ═══════════════════════════════════════════
   API 호출 헬퍼
═══════════════════════════════════════════ */
async function callAI(messages, task = 'chat') {
  try {
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, task }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

/* ─── NLU: 학생 발화에서 슬롯 추출 ─── */
async function extractSlots(userText, category) {
  const prompt = `다음은 학생이 학교 상담에서 한 말입니다. 아래 JSON 형식으로만 답하세요. 다른 말은 절대 쓰지 마세요.
학생 발화: "${userText}"
상담 주제: ${category}

{
  "event": "무슨 일이 있었는지 한 줄",
  "person": "관련 인물 (없으면 null)",
  "place_time": "장소 또는 시간 (없으면 null)",
  "emotion_word": "학생이 직접 쓴 감정 단어 (없으면 null)",
  "want": "학생이 원하는 것 (없으면 null)",
  "next_question": "다음에 물어볼 핵심 질문 1개"
}`;
  const result = await callAI([
    { role:'system', content:'당신은 JSON만 출력하는 NLU 분석기입니다.' },
    { role:'user',   content: prompt }
  ], 'nlu');

  try {
    const jsonStr = result?.match(/\{[\s\S]*\}/)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch {
    return null;
  }
}

/* ─── Rolling Summary 생성/갱신 ─── */
async function generateRollingSummary(prevSummary, recentMessages, category) {
  const recentText = recentMessages
    .filter(m => m.role !== 'system')
    .slice(-10)
    .map(m => `${m.role === 'user' ? '학생' : '선생님'}: ${m.content}`)
    .join('\n');

  const prompt = `당신은 학교 상담 기록 요약 전문가입니다. 아래 이전 요약과 최근 대화를 참고해 요약을 갱신하세요. 반드시 아래 형식으로만 출력하세요.

[이전 요약]
${prevSummary || '(없음)'}

[최근 대화 - 상담 주제: ${category}]
${recentText}

출력 형식(이 형식 그대로):
상황: 학생이 말한 핵심 상황 한 줄
등장인물: 이름/관계 (없으면 없음)
학생 표현: 학생이 직접 쓴 핵심 키워드
가장 힘든 점: 한 줄
아직 확인 못한 점: 다음에 물어볼 1가지`;

  const result = await callAI([
    { role:'system', content:'당신은 상담 기록 요약 전문가입니다.' },
    { role:'user',   content: prompt }
  ], 'summary');

  return result || prevSummary;
}

/* ─── 사실 메모리 갱신 ─── */
function updateFactMemory(prev, slots) {
  if (!slots) return prev;
  const next = { ...prev };

  // 등장인물 누적
  if (slots.person && slots.person !== 'null' && slots.person !== null) {
    const already = next.related_people?.some(p => p.name === slots.person);
    if (!already) {
      next.related_people = [...(next.related_people || []), { name: slots.person, relation: '언급됨' }];
    }
  }
  // 감정 키워드 누적
  if (slots.emotion_word && slots.emotion_word !== 'null' && slots.emotion_word !== null) {
    const words = next.emotion_words || [];
    if (!words.includes(slots.emotion_word)) {
      next.emotion_words = [...words, slots.emotion_word];
    }
  }
  // 타임라인
  if (slots.place_time && slots.place_time !== 'null' && slots.place_time !== null) {
    next.timeline = slots.place_time;
  }
  // 학생이 원하는 것
  if (slots.want && slots.want !== 'null' && slots.want !== null) {
    next.student_want = slots.want;
  }
  return next;
}

/* ─── 시스템 프롬프트 빌더 ─── */
function buildSystemPrompt(category, grade, name, gender, turnCount, rollingSummary, factMemory, askedSlots, lastBotQ) {
  const stage =
    turnCount < 4  ? '1단계(라포형성)' :
    turnCount < 8  ? '2단계(감정탐색)' :
    turnCount < 13 ? '3단계(핵심파악)' : '4단계(해결모색)';

  const factsText = Object.keys(factMemory).length > 0
    ? `\n[확정된 사실 메모리]\n${JSON.stringify(factMemory, null, 2)}`
    : '';
  const summaryText = rollingSummary
    ? `\n[이전 대화 요약]\n${rollingSummary}`
    : '';
  const askedText = askedSlots.length > 0
    ? `\n[이미 물어본 항목 - 절대 반복 금지]: ${askedSlots.join(', ')}`
    : '';
  const lastQText = lastBotQ
    ? `\n[직전 봇 질문 - 유사한 질문 금지]: "${lastBotQ}"`
    : '';

  return `당신은 ${COUNSELOR_NAME}입니다. ${SCHOOL_NAME} 소속 전문 상담교사입니다.
상담 대상: ${grade} ${name}(${gender})
상담 주제: ${category}
현재 상담 단계: ${stage} (${turnCount}번째 대화)
${summaryText}${factsText}${askedText}${lastQText}

[핵심 원칙]
1. 항상 학생이 한 말의 핵심 키워드를 먼저 그대로 반영(공감)하고 나서 질문하세요.
2. 한 번에 질문은 반드시 1개만 하세요.
3. 답변은 2~4문장으로 간결하게 유지하세요.
4. 절대로 AI임을 밝히지 마세요.
5. 위 [이미 물어본 항목]과 [직전 봇 질문]과 유사한 질문을 반복하지 마세요.
6. 확정된 사실 메모리에 있는 인물 이름, 감정 단어를 적절히 다시 언급해 주세요.
7. 고위험 신호(자해/자살) 감지 시: "선생님이 많이 걱정돼. 지금 바로 선생님께 직접 와줄 수 있어?"라고만 응답하세요.

[단계별 상담 방향]
- 1단계: 따뜻하게 환영하고 편안한 분위기를 만드세요.
- 2단계: 감정을 구체적으로 탐색하세요. ("그때 어떤 기분이었어?")
- 3단계: 문제의 핵심을 파악하세요. ("가장 힘든 게 뭔지 말해줄 수 있어?")
- 4단계: 함께 해결책을 찾아가세요. ("어떻게 되면 좀 나아질 것 같아?")

[슬롯별 질문 예시 - 아직 안 물어본 것만]
- person(누가): "그 친구 이름이 뭐야?" / "선생님이야, 친구야?"
- place_time(언제/어디서): "언제 그런 일이 있었어?" / "어디서 그랬어?"
- emotion_word(감정): "그때 어떤 기분이었어?" / "많이 속상했겠다. 어떤 감정이 제일 컸어?"
- want(원하는 것): "어떻게 되면 좀 나아질 것 같아?" / "지금 선생님한테 가장 바라는 게 뭐야?"`;
}

/* ═══════════════════════════════════════════
   메인 컴포넌트
═══════════════════════════════════════════ */
export default function App() {
  /* ── 스텝 ── */
  const [step,     setStep]     = useState('home');
  const [category, setCategory] = useState(null);
  const [grade,    setGrade]    = useState('');
  const [name,     setName]     = useState('');
  const [gender,   setGender]   = useState('');

  /* ── 대화 상태 ── */
  const [messages,    setMessages]    = useState([]);   // API에 보낼 전체 히스토리
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [turnCount,   setTurnCount]   = useState(0);
  const [riskAlert,   setRiskAlert]   = useState(null);

  /* ── 메모리 ── */
  const [rollingSummary, setRollingSummary] = useState('');
  const [factMemory,     setFactMemory]     = useState({});
  const [askedSlots,     setAskedSlots]     = useState([]);  // 이미 물어본 슬롯
  const [lastBotQ,       setLastBotQ]       = useState('');  // 직전 봇 질문

  /* ── 관리자 ── */
  const [showAdmin,    setShowAdmin]    = useState(false);
  const [adminAuth,    setAdminAuth]    = useState(false);
  const [adminPwInput, setAdminPwInput] = useState('');
  const [logs,         setLogs]         = useState([]);
  const [stats,        setStats]        = useState({ total:0, high:0, medium:0 });

  const bottomRef  = useRef(null);
  const clickCount = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  /* ──────────────────────────────────────
     핵심: 통합 메시지 전송 함수
  ────────────────────────────────────── */
  const processAndSend = useCallback(async (userText, currentMessages, currentTurn, isInit = false) => {
    let reply    = null;
    let riskLevel = getRiskLevel(userText);

    /* ① NLU 슬롯 추출 (init 턴 제외) */
    let slots = null;
    if (!isInit) {
      slots = await extractSlots(userText, category?.label || '');
      if (slots) {
        // 새로 파악된 슬롯 기록
        const newAsked = [...askedSlots];
        if (slots.person       && slots.person       !== 'null') { if(!newAsked.includes('person'))     newAsked.push('person'); }
        if (slots.place_time   && slots.place_time   !== 'null') { if(!newAsked.includes('place_time')) newAsked.push('place_time'); }
        if (slots.emotion_word && slots.emotion_word !== 'null') { if(!newAsked.includes('emotion_word')) newAsked.push('emotion_word'); }
        if (slots.want         && slots.want         !== 'null') { if(!newAsked.includes('want'))       newAsked.push('want'); }
        setAskedSlots(newAsked);
        setFactMemory(prev => updateFactMemory(prev, slots));
      }
    }

    /* ② 위기 감지 */
    if (riskLevel === 'high') {
      reply = '선생님이 많이 걱정돼. 지금 바로 선생님께 직접 와줄 수 있어? 💙';
      setRiskAlert('high');
    } else if (riskLevel === 'medium') {
      setRiskAlert('medium');
    }

    /* ③ AI 호출 (위기여도 일단 AI 답변 생성, 위기 시엔 덮어쓰기) */
    const newTurn     = currentTurn + 1;
    const sysPrompt   = buildSystemPrompt(
      category?.label || '',
      grade, name, gender,
      newTurn,
      rollingSummary,
      factMemory,
      askedSlots,
      lastBotQ
    );

    const apiMessages = [
      { role:'system',    content: sysPrompt },
      ...currentMessages.filter(m => m.role !== 'system'),
      { role:'user',      content: userText },
    ];

    if (!reply) {
      const aiResult = await callAI(apiMessages, 'chat');
      reply = aiResult || '선생님이 잠깐 자리를 비웠어요. 다시 말해줄 수 있어? 😊';
    }

    /* ④ 반복 질문 방지: 유사도 0.6 이상이면 재생성 (1회) */
    if (lastBotQ && simpleSimilarity(reply, lastBotQ) > 0.6) {
      const retryMessages = [
        ...apiMessages,
        { role:'assistant', content: reply },
        { role:'user',      content: '(지시) 방금 답변이 직전 질문과 너무 비슷해. 완전히 다른 관점에서 1개의 새로운 질문으로 바꿔줘.' },
      ];
      const retried = await callAI(retryMessages, 'chat');
      if (retried) reply = retried;
    }

    /* ⑤ 직전 봇 질문 저장 (물음표 포함 문장 추출) */
    const questionMatch = reply.match(/[^.!?]*\?/g);
    if (questionMatch?.length) setLastBotQ(questionMatch[questionMatch.length - 1].trim());

    /* ⑥ history 통합 저장 (어떤 경로든 반드시 저장) */
    const finalMessages = [
      ...apiMessages,
      { role:'assistant', content: reply },
    ];
    setMessages(finalMessages);
    setTurnCount(newTurn);

    /* ⑦ Rolling Summary (N턴마다 갱신) */
    if (!isInit && newTurn % SUMMARY_EVERY === 0) {
      generateRollingSummary(rollingSummary, finalMessages, category?.label || '').then(s => {
        if (s) setRollingSummary(s);
      });
    }

    /* ⑧ 관리자 로그 저장 */
    if (!isInit) {
      const logEntry = {
        time:     new Date().toLocaleString(),
        name, grade, gender,
        category: category?.label || '',
        userMsg:  userText,
        aiMsg:    reply,
        risk:     riskLevel,
        slots:    JSON.stringify(slots || {}),
      };
      setLogs(prev => [...prev, logEntry]);
      setStats(prev => ({
        total:  prev.total  + 1,
        high:   prev.high   + (riskLevel === 'high'   ? 1 : 0),
        medium: prev.medium + (riskLevel === 'medium' ? 1 : 0),
      }));
    }

    return reply;
  }, [category, grade, name, gender, rollingSummary, factMemory, askedSlots, lastBotQ]);

  /* ── 스텝 핸들러 ── */
  const handleCategorySelect = (cat) => { setCategory(cat); setStep('grade'); };
  const handleGradeSelect    = (g)   => { setGrade(g);      setStep('name'); };
  const handleNameSubmit     = (e)   => { e.preventDefault(); if (name.trim()) setStep('gender'); };

  const handleGenderSelect = async (g) => {
    setGender(g);
    setLoading(true);
    const initText = `안녕하세요, 저는 ${grade} ${name}이에요. ${category.label}에 대해 이야기하고 싶어요.`;
    await processAndSend(initText, [], 0, true);
    setStep('chat');
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim();
    setInput('');
    setLoading(true);
    await processAndSend(txt, messages, turnCount);
    setLoading(false);
  };

  /* ── 관리자 ── */
  const handleHeaderClick = () => {
    clickCount.current += 1;
    if (clickCount.current >= 3) { clickCount.current = 0; setShowAdmin(true); }
    setTimeout(() => { clickCount.current = 0; }, 2000);
  };
  const handleAdminLogin = () => {
    if (adminPwInput === ADMIN_PW) { setAdminAuth(true); setAdminPwInput(''); }
    else alert('비밀번호가 틀렸습니다.');
  };
  const exportCSV = () => {
    const header = '시간,이름,학년,성별,카테고리,위험도,학생메시지,AI응답,슬롯\n';
    const rows   = logs.map(l =>
      `"${l.time}","${l.name}","${l.grade}","${l.gender}","${l.category}","${l.risk}","${l.userMsg}","${l.aiMsg}","${l.slots}"`
    ).join('\n');
    const blob = new Blob(['\uFEFF'+header+rows], { type:'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'weeclass_log.csv';
    a.click();
  };

  /* ══════════════════════════════════════
     스타일
  ══════════════════════════════════════ */
  const S = {
    wrap: {
      minHeight:'100vh',
      backgroundImage:'url(/school_bg.jpg)',
      backgroundSize:'cover',
      backgroundPosition:'center',
      backgroundAttachment:'fixed',
      display:'flex', flexDirection:'column', alignItems:'center',
    },
    overlay: {
      minHeight:'100vh', width:'100%',
      background:'rgba(255,255,255,0.82)',
      display:'flex', flexDirection:'column', alignItems:'center',
    },
    header: {
      width:'100%', maxWidth:480,
      background:'linear-gradient(135deg,#ff9a9e,#fad0c4)',
      padding:'18px 24px', textAlign:'center',
      borderRadius:'0 0 20px 20px',
      boxShadow:'0 4px 16px rgba(255,154,158,0.25)',
      cursor:'pointer', userSelect:'none',
    },
    title:    { fontSize:18, fontWeight:800, color:'#fff', margin:0 },
    subtitle: { fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:4 },
    card: {
      width:'100%', maxWidth:480, margin:'20px 0',
      background:'#fff', borderRadius:20,
      boxShadow:'0 8px 32px rgba(0,0,0,0.10)', padding:24,
    },
    introText: { textAlign:'center', color:'#555', fontSize:15, marginBottom:20, lineHeight:1.6 },
    grid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 },
    catBtn: {
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'12px 4px', borderRadius:14, border:'2px solid #ffe0e6',
      background:'#fff9fb', cursor:'pointer', transition:'all .2s',
      fontSize:12, color:'#555', fontWeight:600,
    },
    emoji: { fontSize:30, marginBottom:4 },
    gradeGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 },
    gradeBtn: {
      padding:'16px', borderRadius:14, border:'2px solid #ffd6dc',
      background:'#fff0f3', fontSize:16, fontWeight:700, color:'#e05a7a', cursor:'pointer',
    },
    inputField: {
      width:'100%', padding:'12px 16px', borderRadius:12,
      border:'2px solid #ffd6dc', fontSize:15, outline:'none', boxSizing:'border-box',
    },
    btn: {
      width:'100%', padding:'13px', borderRadius:14, border:'none',
      background:'linear-gradient(135deg,#ff9a9e,#fad0c4)',
      color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer', marginTop:12,
    },
    genderWrap: { display:'flex', gap:12, justifyContent:'center' },
    genderBtn: {
      flex:1, padding:'18px', borderRadius:16, border:'2px solid #ffd6dc',
      background:'#fff0f3', fontSize:28, cursor:'pointer', textAlign:'center',
    },
    chatWrap: {
      display:'flex', flexDirection:'column', gap:10,
      marginBottom:16, maxHeight:400, overflowY:'auto', paddingRight:4,
    },
    bubble: (role) => ({
      maxWidth:'80%', padding:'10px 14px',
      borderRadius: role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      background:   role==='user' ? 'linear-gradient(135deg,#ff9a9e,#fad0c4)' : '#f4f4f4',
      color:        role==='user' ? '#fff' : '#333',
      alignSelf:    role==='user' ? 'flex-end' : 'flex-start',
      fontSize:14, lineHeight:1.6,
    }),
    sendRow:  { display:'flex', gap:8 },
    sendInput:{
      flex:1, padding:'11px 14px', borderRadius:24,
      border:'2px solid #ffd6dc', fontSize:14, outline:'none',
    },
    sendBtn: {
      padding:'11px 20px', borderRadius:24, border:'none',
      background:'linear-gradient(135deg,#ff9a9e,#fad0c4)',
      color:'#fff', fontWeight:700, cursor:'pointer',
    },
    alert: (level) => ({
      padding:'12px 16px', borderRadius:12, marginBottom:12,
      background: level==='high' ? '#ffe0e0' : '#fff3cd',
      border: `1px solid ${level==='high' ? '#ff8080' : '#ffcc00'}`,
      color:  level==='high' ? '#c0392b' : '#856404', fontSize:13,
    }),
    memChip: {
      display:'inline-block', margin:'0 4px 4px 0',
      padding:'3px 10px', borderRadius:20,
      background:'#fff0f3', border:'1px solid #ffd6dc',
      fontSize:11, color:'#e05a7a',
    },
    modal: {
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'rgba(0,0,0,0.45)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:999,
    },
    modalBox: {
      background:'#fff', borderRadius:20, padding:32,
      width:360, maxWidth:'92vw',
      boxShadow:'0 8px 40px rgba(0,0,0,0.2)',
    },
  };

  /* ══════════════════════════════════════
     렌더링
  ══════════════════════════════════════ */
  return (
    <div style={S.wrap}>
      <div style={S.overlay}>

        {/* ── 헤더 (3번 클릭 → 관리자) ── */}
        <div style={S.header} onClick={handleHeaderClick}>
          <p style={S.title}>💙 위클래스 상담소! 마음아 우리 같이 학교가자!</p>
          <p style={S.subtitle}>{COUNSELOR_NAME}</p>
        </div>

        {/* ── HOME ── */}
        {step === 'home' && (
          <div style={S.card}>
            <p style={S.introText}>
              안녕, 마음아! 위클래스에 온걸 환영해. 🌸<br/>
              오늘은 선생님하고 어떤 이야기를 하고 싶을까?
            </p>
            <div style={S.grid}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} style={S.catBtn}
                  onMouseEnter={e => { e.currentTarget.style.background='#ffe8ed'; e.currentTarget.style.borderColor='#ff9aae'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='#fff9fb'; e.currentTarget.style.borderColor='#ffe0e6'; }}
                  onClick={() => handleCategorySelect(cat)}>
                  <span style={S.emoji}>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── GRADE ── */}
        {step === 'grade' && (
          <div style={S.card}>
            <p style={S.introText}>📚 몇 학년이에요?</p>
            <div style={S.gradeGrid}>
              {GRADES.map(g => (
                <button key={g} style={S.gradeBtn} onClick={() => handleGradeSelect(g)}>{g}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── NAME ── */}
        {step === 'name' && (
          <div style={S.card}>
            <p style={S.introText}>✏️ 이름을 알려줄래요?</p>
            <form onSubmit={handleNameSubmit}>
              <input style={S.inputField} value={name}
                onChange={e => setName(e.target.value)}
                placeholder="이름 입력" autoFocus />
              <button type="submit" style={S.btn}>다음 →</button>
            </form>
          </div>
        )}

        {/* ── GENDER ── */}
        {step === 'gender' && (
          <div style={S.card}>
            <p style={S.introText}>성별을 선택해줄래요?</p>
            <div style={S.genderWrap}>
              <button style={S.genderBtn} onClick={() => handleGenderSelect('남학생')}>
                👦<br/><span style={{fontSize:13}}>남학생</span>
              </button>
              <button style={S.genderBtn} onClick={() => handleGenderSelect('여학생')}>
                👧<br/><span style={{fontSize:13}}>여학생</span>
              </button>
            </div>
            {loading && <p style={{textAlign:'center',color:'#aaa',marginTop:16}}>선생님이 준비 중이에요... 💙</p>}
          </div>
        )}

        {/* ── CHAT ── */}
        {step === 'chat' && (
          <div style={S.card}>
            {/* 위기 알림 */}
            {riskAlert && (
              <div style={S.alert(riskAlert)}>
                {riskAlert === 'high'
                  ? '⚠️ 선생님이 많이 걱정돼. 지금 바로 선생님께 직접 와줄 수 있어?'
                  : '💛 많이 힘들었겠다. 선생님이 함께 있어.'}
              </div>
            )}

            {/* 사실 메모리 칩 */}
            {Object.keys(factMemory).length > 0 && (
              <div style={{marginBottom:10}}>
                {factMemory.related_people?.map((p,i)=>(
                  <span key={i} style={S.memChip}>👤 {p.name}</span>
                ))}
                {factMemory.emotion_words?.map((w,i)=>(
                  <span key={i} style={S.memChip}>💬 {w}</span>
                ))}
                {factMemory.timeline && <span style={S.memChip}>🕐 {factMemory.timeline}</span>}
              </div>
            )}

            {/* 채팅 버블 */}
            <div style={S.chatWrap}>
              {messages.filter(m => m.role !== 'system').map((m,i) => (
                <div key={i} style={S.bubble(m.role)}>{m.content}</div>
              ))}
              {loading && (
                <div style={S.bubble('assistant')}>💙 선생님이 생각 중이에요...</div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* 입력창 */}
            <div style={S.sendRow}>
              <input
                style={S.sendInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="메시지를 입력해줘..."
                disabled={loading}
              />
              <button style={S.sendBtn} onClick={handleSend} disabled={loading}>전송</button>
            </div>

            {/* Rolling Summary 디버그 표시 (개발용 - 운영시 삭제 가능) */}
            {rollingSummary && (
              <details style={{marginTop:12, fontSize:11, color:'#aaa'}}>
                <summary style={{cursor:'pointer'}}>📋 대화 요약 보기</summary>
                <pre style={{whiteSpace:'pre-wrap', marginTop:6}}>{rollingSummary}</pre>
              </details>
            )}
          </div>
        )}

        {/* ── 관리자 모달 ── */}
        {showAdmin && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              {!adminAuth ? (
                <>
                  <h3 style={{marginTop:0}}>🔐 관리자 로그인</h3>
                  <input
                    style={{...S.inputField, marginBottom:12}}
                    type="password"
                    value={adminPwInput}
                    onChange={e => setAdminPwInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleAdminLogin()}
                    placeholder="비밀번호 입력"
                    autoFocus
                  />
                  <button style={S.btn} onClick={handleAdminLogin}>로그인</button>
                  <button style={{...S.btn, background:'#ccc', marginTop:8}} onClick={() => setShowAdmin(false)}>취소</button>
                </>
              ) : (
                <>
                  <h3 style={{marginTop:0}}>📊 상담 현황 대시보드</h3>
                  <p>전체 대화 수: <strong>{stats.total}</strong></p>
                  <p>⚠️ 고위험: <strong style={{color:'red'}}>{stats.high}</strong></p>
                  <p>💛 주의: <strong style={{color:'orange'}}>{stats.medium}</strong></p>

                  {/* 사실 메모리 현황 */}
                  {Object.keys(factMemory).length > 0 && (
                    <>
                      <hr/>
                      <h4 style={{marginBottom:6}}>🧠 현재 세션 사실 메모리</h4>
                      <pre style={{fontSize:11, background:'#f9f9f9', padding:10, borderRadius:8, overflowX:'auto'}}>
                        {JSON.stringify(factMemory, null, 2)}
                      </pre>
                    </>
                  )}

                  <hr/>
                  <h4>📝 최근 상담 로그</h4>
                  <div style={{maxHeight:220, overflowY:'auto', fontSize:12}}>
                    {logs.slice(-10).reverse().map((l,i) => (
                      <div key={i} style={{borderBottom:'1px solid #eee', paddingBottom:8, marginBottom:8}}>
                        <span style={{color:'#888'}}>{l.time}</span><br/>
                        <strong>{l.name}</strong>({l.grade}) · {l.category} ·
                        <span style={{color: l.risk==='high'?'red': l.risk==='medium'?'orange':'green'}}> {l.risk}</span><br/>
                        학생: {l.userMsg}<br/>
                        AI: {l.aiMsg}
                      </div>
                    ))}
                  </div>
                  <button style={S.btn} onClick={exportCSV}>📥 CSV 내보내기</button>
                  <button style={{...S.btn, background:'#ccc', marginTop:8}}
                    onClick={() => { setShowAdmin(false); setAdminAuth(false); }}>닫기</button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
