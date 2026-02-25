import React, { useState, useRef, useEffect } from 'react';

const COUNSELOR_NAME = '마음따숩 김윤정 위클래스쌤';
const SCHOOL_NAME = '위클래스 상담소';
const ADMIN_PW = 'weeclass2024';

const GRADES = ['1학년','2학년','3학년','교직원'];

const CATEGORIES = [
  { id: 1,  emoji: '😔', label: '우울·슬픔' },
  { id: 2,  emoji: '😰', label: '불안·걱정' },
  { id: 3,  emoji: '😤', label: '분노·짜증' },
  { id: 4,  emoji: '👫', label: '친구관계' },
  { id: 5,  emoji: '💔', label: '이성교제' },
  { id: 6,  emoji: '👨‍👩‍👧', label: '가족갈등' },
  { id: 7,  emoji: '📚', label: '학업·성적' },
  { id: 8,  emoji: '🏫', label: '학교폭력' },
  { id: 9,  emoji: '📱', label: '스마트폰중독' },
  { id: 10, emoji: '🎮', label: '게임중독' },
  { id: 11, emoji: '🍽️', label: '섭식문제' },
  { id: 12, emoji: '😴', label: '수면문제' },
  { id: 13, emoji: '🤒', label: '신체증상' },
  { id: 14, emoji: '🆘', label: '자해·자살' },
  { id: 15, emoji: '🧠', label: 'ADHD·집중력' },
  { id: 16, emoji: '🏃', label: '진로·진학' },
  { id: 17, emoji: '💪', label: '자존감' },
  { id: 18, emoji: '😶', label: '외로움·고립' },
  { id: 19, emoji: '🌀', label: '스트레스' },
  { id: 20, emoji: '💬', label: '기타고민' },
];

const RISK_KEYWORDS = {
  high: ['자살','죽고싶','죽을','자해','손목','약먹','뛰어내','목매','사라지고 싶','없어지고 싶'],
  medium: ['때리','폭력','협박','싸움','맞았','왕따','따돌림','괴롭'],
};

function getRiskLevel(text) {
  if (!text) return 'low';
  const t = text.toLowerCase();
  if (RISK_KEYWORDS.high.some(k => t.includes(k))) return 'high';
  if (RISK_KEYWORDS.medium.some(k => t.includes(k))) return 'medium';
  return 'low';
}

function buildSystemPrompt(category, grade, name, gender, turnCount) {
  const stage =
    turnCount < 4  ? '1단계(라포형성)' :
    turnCount < 8  ? '2단계(감정탐색)' :
    turnCount < 13 ? '3단계(핵심파악)' : '4단계(해결모색)';

  return `당신은 ${COUNSELOR_NAME}입니다. ${SCHOOL_NAME} 소속 전문 상담교사입니다.
상담 대상: ${grade} ${name}(${gender})
상담 주제: ${category}
현재 상담 단계: ${stage} (${turnCount}번째 대화)

[핵심 원칙]
1. 항상 상대방이 한 말의 핵심 키워드를 먼저 반영(공감)하고 나서 질문하세요.
2. 한 번에 질문은 반드시 1개만 하세요.
3. 답변은 2~4문장으로 간결하게 유지하세요.
4. 절대로 AI임을 밝히지 마세요.
5. 고위험 신호(자해/자살) 감지 시: "선생님이 많이 걱정돼. 지금 바로 선생님께 직접 와줄 수 있어?"라고 응답하세요.

[단계별 상담 방향]
- 1단계: 따뜻하게 환영하고 편안한 분위기를 만드세요.
- 2단계: 감정을 구체적으로 탐색하세요. ("그때 어떤 기분이었어?")
- 3단계: 문제의 핵심을 파악하세요. ("가장 힘든 게 뭔지 말해줄 수 있어?")
- 4단계: 함께 해결책을 찾아가세요. ("어떻게 되면 좀 나아질 것 같아?")`;
}

async function callAI(messages) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '선생님이 잠깐 생각 중이에요. 다시 말해줄래? 💙';
  } catch {
    return '연결이 잠깐 끊겼어. 다시 말해줄 수 있어? 😊';
  }
}

export default function App() {
  const [step, setStep]         = useState('home');
  const [category, setCategory] = useState(null);
  const [grade, setGrade]       = useState('');
  const [name, setName]         = useState('');
  const [gender, setGender]     = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [riskAlert, setRiskAlert] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState('');
  const [logs, setLogs]         = useState([]);
  const [stats, setStats]       = useState({ total:0, high:0, medium:0 });
  const bottomRef = useRef(null);
  const clickCount = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleCategorySelect = async (cat) => {
    setCategory(cat);
    setStep('grade');
  };

  const handleGradeSelect = (g) => { setGrade(g); setStep('name'); };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) setStep('gender');
  };

  const handleGenderSelect = async (g) => {
    setGender(g);
    setLoading(true);
    const systemPrompt = buildSystemPrompt(category.label, grade, name, g, 0);
    const initMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `안녕하세요, 저는 ${grade} ${name}이에요. ${category.label}에 대해 이야기하고 싶어요.` },
    ];
    const reply = await callAI(initMessages);
    setMessages([...initMessages, { role: 'assistant', content: reply }]);
    setTurnCount(1);
    setStep('chat');
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    const risk = getRiskLevel(userText);
    if (risk === 'high') setRiskAlert('high');
    else if (risk === 'medium') setRiskAlert('medium');

    const newTurn = turnCount + 1;
    setTurnCount(newTurn);
    const systemPrompt = buildSystemPrompt(category.label, grade, name, gender, newTurn);
    const updatedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system'),
      { role: 'user', content: userText },
    ];
    setMessages(updatedMessages);
    setLoading(true);
    const reply = await callAI(updatedMessages);
    const finalMessages = [...updatedMessages, { role: 'assistant', content: reply }];
    setMessages(finalMessages);
    setLoading(false);

    const logEntry = { time: new Date().toLocaleString(), name, grade, gender, category: category.label, userMsg: userText, aiMsg: reply, risk };
    setLogs(prev => [...prev, logEntry]);
    setStats(prev => ({
      total: prev.total + 1,
      high:   prev.high   + (risk === 'high'   ? 1 : 0),
      medium: prev.medium + (risk === 'medium' ? 1 : 0),
    }));
  };

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
    const header = '시간,이름,학년,성별,카테고리,위험도,학생메시지,AI응답\n';
    const rows = logs.map(l =>
      `"${l.time}","${l.name}","${l.grade}","${l.gender}","${l.category}","${l.risk}","${l.userMsg}","${l.aiMsg}"`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'weeclass_log.csv'; a.click();
  };

  /* ── 스타일 ── */
  const styles = {
    wrap: {
      minHeight: '100vh',
      backgroundImage: 'url(/school_bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    overlay: {
      minHeight: '100vh', width: '100%',
      background: 'rgba(255,255,255,0.82)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    header: {
      width: '100%', maxWidth: 480,
      background: 'linear-gradient(135deg,#ff9a9e,#fad0c4)',
      padding: '18px 24px', textAlign: 'center',
      borderRadius: '0 0 20px 20px',
      boxShadow: '0 4px 16px rgba(255,154,158,0.25)',
      cursor: 'pointer', userSelect: 'none',
    },
    title: { fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    card: {
      width: '100%', maxWidth: 480, margin: '20px 0',
      background: '#fff', borderRadius: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: 24,
    },
    introText: { textAlign:'center', color:'#555', fontSize:15, marginBottom:20, lineHeight:1.6 },
    grid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 },
    catBtn: {
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'12px 4px', borderRadius:14, border:'2px solid #ffe0e6',
      background:'#fff9fb', cursor:'pointer', transition:'all .2s',
      fontSize: 13, color:'#555', fontWeight:600,
    },
    emoji: { fontSize: 30, marginBottom: 4 },   /* ← 150% 크기 */
    gradeGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 },
    gradeBtn: {
      padding:'16px', borderRadius:14, border:'2px solid #ffd6dc',
      background:'#fff0f3', fontSize:16, fontWeight:700, color:'#e05a7a',
      cursor:'pointer',
    },
    input: {
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
    chatWrap: { display:'flex', flexDirection:'column', gap:10, marginBottom:16, maxHeight:380, overflowY:'auto' },
    bubble: (role) => ({
      maxWidth:'80%', padding:'10px 14px', borderRadius: role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',
      background: role==='user'?'linear-gradient(135deg,#ff9a9e,#fad0c4)':'#f4f4f4',
      color: role==='user'?'#fff':'#333',
      alignSelf: role==='user'?'flex-end':'flex-start',
      fontSize:14, lineHeight:1.6,
    }),
    sendRow: { display:'flex', gap:8 },
    sendInput: {
      flex:1, padding:'11px 14px', borderRadius:24, border:'2px solid #ffd6dc', fontSize:14, outline:'none',
    },
    sendBtn: {
      padding:'11px 20px', borderRadius:24, border:'none',
      background:'linear-gradient(135deg,#ff9a9e,#fad0c4)',
      color:'#fff', fontWeight:700, cursor:'pointer',
    },
    alert: (level) => ({
      padding:'12px 16px', borderRadius:12, marginBottom:12,
      background: level==='high'?'#ffe0e0':'#fff3cd',
      border: `1px solid ${level==='high'?'#ff8080':'#ffcc00'}`,
      color: level==='high'?'#c0392b':'#856404', fontSize:13,
    }),
    modal: {
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999,
    },
    modalBox: {
      background:'#fff', borderRadius:20, padding:32, width:340, maxWidth:'90vw',
      boxShadow:'0 8px 40px rgba(0,0,0,0.2)',
    },
  };

  /* ── 화면 렌더링 ── */
  return (
    <div style={styles.wrap}>
      <div style={styles.overlay}>

        {/* 헤더 (관리자 숨김: 헤더 3번 클릭으로 진입) */}
        <div style={styles.header} onClick={handleHeaderClick}>
          <p style={styles.title}>💙 위클래스 상담소! 마음아 우리 같이 학교가자!</p>
          <p style={styles.subtitle}>{COUNSELOR_NAME}</p>
        </div>

        {/* ─── HOME ─── */}
        {step === 'home' && (
          <div style={styles.card}>
            <p style={styles.introText}>
              안녕, 마음아! 위클래스에 온걸 환영해. 오늘은 선생님하고 어떤 이야기를 하고 싶을까? 🌸
            </p>
            <div style={styles.grid}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} style={styles.catBtn} onClick={() => handleCategorySelect(cat)}>
                  <span style={styles.emoji}>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── GRADE ─── */}
        {step === 'grade' && (
          <div style={styles.card}>
            <p style={styles.introText}>📚 몇 학년이에요?</p>
            <div style={styles.gradeGrid}>
              {GRADES.map(g => (
                <button key={g} style={styles.gradeBtn} onClick={() => handleGradeSelect(g)}>{g}</button>
              ))}
            </div>
          </div>
        )}

        {/* ─── NAME ─── */}
        {step === 'name' && (
          <div style={styles.card}>
            <p style={styles.introText}>✏️ 이름을 알려줄래요?</p>
            <form onSubmit={handleNameSubmit}>
              <input style={styles.input} value={name} onChange={e=>setName(e.target.value)} placeholder="이름 입력" autoFocus />
              <button type="submit" style={styles.btn}>다음 →</button>
            </form>
          </div>
        )}

        {/* ─── GENDER ─── */}
        {step === 'gender' && (
          <div style={styles.card}>
            <p style={styles.introText}>성별을 선택해줄래요?</p>
            <div style={styles.genderWrap}>
              <button style={styles.genderBtn} onClick={()=>handleGenderSelect('남학생')}>👦<br/><span style={{fontSize:13}}>남학생</span></button>
              <button style={styles.genderBtn} onClick={()=>handleGenderSelect('여학생')}>👧<br/><span style={{fontSize:13}}>여학생</span></button>
            </div>
          </div>
        )}

        {/* ─── CHAT ─── */}
        {step === 'chat' && (
          <div style={styles.card}>
            {riskAlert && (
              <div style={styles.alert(riskAlert)}>
                {riskAlert === 'high'
                  ? '⚠️ 선생님이 많이 걱정돼. 지금 바로 선생님께 직접 와줄 수 있어?'
                  : '💛 많이 힘들었겠다. 선생님이 함께 있어.'}
              </div>
            )}
            <div style={styles.chatWrap}>
              {messages.filter(m=>m.role!=='system').map((m,i)=>(
                <div key={i} style={styles.bubble(m.role)}>{m.content}</div>
              ))}
              {loading && <div style={styles.bubble('assistant')}>💙 선생님이 생각 중이에요...</div>}
              <div ref={bottomRef}/>
            </div>
            <div style={styles.sendRow}>
              <input
                style={styles.sendInput}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleSend()}
                placeholder="메시지를 입력해줘..."
              />
              <button style={styles.sendBtn} onClick={handleSend}>전송</button>
            </div>
          </div>
        )}

        {/* ─── ADMIN 모달 ─── */}
        {showAdmin && (
          <div style={styles.modal}>
            <div style={styles.modalBox}>
              {!adminAuth ? (
                <>
                  <h3 style={{marginTop:0}}>🔐 관리자 로그인</h3>
                  <input
                    style={{...styles.input, marginBottom:12}}
                    type="password"
                    value={adminPwInput}
                    onChange={e=>setAdminPwInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&handleAdminLogin()}
                    placeholder="비밀번호 입력"
                    autoFocus
                  />
                  <button style={styles.btn} onClick={handleAdminLogin}>로그인</button>
                  <button style={{...styles.btn, background:'#ccc', marginTop:8}} onClick={()=>setShowAdmin(false)}>취소</button>
                </>
              ) : (
                <>
                  <h3 style={{marginTop:0}}>📊 상담 현황</h3>
                  <p>전체 대화 수: <strong>{stats.total}</strong></p>
                  <p>⚠️ 고위험: <strong style={{color:'red'}}>{stats.high}</strong></p>
                  <p>💛 주의: <strong style={{color:'orange'}}>{stats.medium}</strong></p>
                  <hr/>
                  <h4>최근 로그</h4>
                  <div style={{maxHeight:200, overflowY:'auto', fontSize:12}}>
                    {logs.slice(-10).reverse().map((l,i)=>(
                      <div key={i} style={{borderBottom:'1px solid #eee', paddingBottom:8, marginBottom:8}}>
                        <span style={{color:'#888'}}>{l.time}</span><br/>
                        <strong>{l.name}</strong>({l.grade}) · {l.category} · 위험도:{l.risk}<br/>
                        학생: {l.userMsg}<br/>
                        AI: {l.aiMsg}
                      </div>
                    ))}
                  </div>
                  <button style={styles.btn} onClick={exportCSV}>📥 CSV 내보내기</button>
                  <button style={{...styles.btn, background:'#ccc', marginTop:8}} onClick={()=>{setShowAdmin(false);setAdminAuth(false);}}>닫기</button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
