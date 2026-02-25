import React, { useState, useEffect, useRef, useCallback } from 'react';

// =============================================
// 상수 정의
// =============================================
const SCHOOL_NAME = '은평초등학교';
const COUNSELOR_NAME = '마음따숩 김윤정 위클래스쌤';
const ADMIN_PW = 'weeclass2024';
const GRADES = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'];

const CATEGORIES = [
  { id: 'friend',    label: '친구 관계',   emoji: '👫', keywords: ['친구','사이','싸움','무시','왕따','따돌림','욕','험담','배신','화해'] },
  { id: 'study',     label: '공부 걱정',   emoji: '📚', keywords: ['공부','성적','시험','숙제','학원','수업','모르겠','어려워','집중'] },
  { id: 'family',    label: '가족 이야기', emoji: '🏠', keywords: ['엄마','아빠','부모','형','언니','오빠','동생','집','가족','혼나'] },
  { id: 'emotion',   label: '감정 표현',   emoji: '💭', keywords: ['화나','슬프','외로워','무서워','불안','걱정','짜증','속상','기분'] },
  { id: 'bully',     label: '학교폭력',    emoji: '🛡️', keywords: ['때려','맞아','괴롭','폭력','협박','빼앗','강요','신체'] },
  { id: 'teacher',   label: '선생님 고민', emoji: '🏫', keywords: ['선생님','담임','야단','혼났','억울','불공평','차별'] },
  { id: 'health',    label: '몸 건강',     emoji: '💊', keywords: ['아파','두통','배탈','못자','잠','피곤','밥','식욕'] },
  { id: 'lonely',    label: '외로움',      emoji: '🌙', keywords: ['혼자','외로','친구없','소외','낀다','껴줘'] },
  { id: 'future',    label: '꿈과 진로',   emoji: '🌟', keywords: ['꿈','장래','직업','미래','하고싶','되고싶'] },
  { id: 'sns',       label: 'SNS 고민',    emoji: '📱', keywords: ['카톡','인스타','유튜브','게임','댓글','사진','올렸'] },
  { id: 'love',      label: '이성 친구',   emoji: '💕', keywords: ['좋아해','고백','짝사랑','사귀','헤어','남친','여친'] },
  { id: 'secret',    label: '비밀 이야기', emoji: '🔒', keywords: ['비밀','말못해','아무도','혼자만','털어놓'] },
  { id: 'angry',     label: '화 조절',     emoji: '😤', keywords: ['화','폭발','참을수','때리고싶','소리지르','분노'] },
  { id: 'sad',       label: '우울한 기분', emoji: '😢', keywords: ['우울','슬프','울고','눈물','힘들어','무기력','아무것도'] },
  { id: 'anxiety',   label: '불안·걱정',   emoji: '😰', keywords: ['불안','떨려','무서워','걱정','긴장','두근'] },
  { id: 'game',      label: '게임·중독',   emoji: '🎮', keywords: ['게임','핸드폰','유튜브','중독','못끊','벌받'] },
  { id: 'sibling',   label: '형제·자매',   emoji: '👧👦', keywords: ['형제','자매','동생','형','언니','오빠','비교','편애'] },
  { id: 'praise',    label: '칭찬받고싶어',emoji: '🌸', keywords: ['칭찬','인정','잘했','못해','자신없','자신감'] },
  { id: 'teacher2',  label: '학교생활',    emoji: '🎒', keywords: ['학교','교실','급식','청소','당번','발표','부끄'] },
  { id: 'etc',       label: '기타 고민',   emoji: '💬', keywords: [] }
];

const HIGH_RISK = [
  '죽고싶','죽을래','죽어버','자살','자해','손목','칼로','뛰어내','목매','안살','살기싫','없어지고싶'
];
const MEDIUM_RISK = [
  '때려','맞았','폭력','협박','학대','무서워','도망','신고','경찰','빼앗','강요'
];

// =============================================
// 유틸 함수
// =============================================
function getRisk(text) {
  const t = text.toLowerCase();
  if (HIGH_RISK.some(k => t.includes(k))) return 'high';
  if (MEDIUM_RISK.some(k => t.includes(k))) return 'medium';
  return 'low';
}

function getCategory(text) {
  const t = text.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => t.includes(k))) return cat.id;
  }
  return 'etc';
}

function getCategoryLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || '기타';
}

function getRiskBadge(risk) {
  if (risk === 'high')   return { text: '🔴 고위험', color: '#ef4444' };
  if (risk === 'medium') return { text: '🟡 주의',   color: '#f59e0b' };
  return                        { text: '🟢 일반',   color: '#10b981' };
}

function parseName(text) {
  const cleaned = text.replace(/[^가-힣a-zA-Z]/g, '');
  return cleaned.length >= 1 && cleaned.length <= 6 ? cleaned : null;
}

// =============================================
// 시스템 프롬프트 — 상담 핵심 로직
// =============================================
function buildSystemPrompt(name, gender, grade, turn) {
  const genderText = gender === 'female' ? '여학생'
                   : gender === 'male'   ? '남학생'
                   : '학생';

  const role = `
너는 ${SCHOOL_NAME} 위클래스 상담교사 "${COUNSELOR_NAME}"이야.
지금 ${grade} ${genderText} "${name}"와 1:1 채팅 상담 중이야.
이 아이는 용기를 내서 먼저 말을 걸어온 거야. 
절대로 AI라고 밝히지 마. 실제 선생님처럼 자연스럽게 대화해.
`;

  const readingRules = `
[상대 말 읽기 — 가장 중요한 규칙]
1. ${name}이(가) 쓴 단어를 그대로 반영해서 공감해라
   예) 학생: "짜증나요" → "짜증이 많이 났구나, 어떤 일이 있었어?"
   절대 금지: 학생이 쓰지 않은 감정 단어를 먼저 단정짓는 것
2. 학생이 말하지 않은 감정을 추측해서 단정하지 마라. 반드시 질문으로 확인해라
3. 이전 대화에서 나온 이름, 장소, 사건, 키워드를 기억하고 자연스럽게 연결해라
   예) 앞에서 "민지"가 나왔다면 → "아까 말한 민지랑 또 있었어?"
4. 한 번에 질문은 반드시 하나만 해라. 두 개 이상 절대 금지
5. 해결책, 조언, 훈계는 학생이 먼저 요청하기 전까지 절대 하지 마라
`;

  const stageGuide = turn <= 3
    ? `[현재 단계: 라포 형성 — ${turn}번째 대화]
목표: 편안함과 신뢰 만들기. 이름을 불러주고 짧게 공감하고 판단 없이 받아줘라.
지금 해야 할 것: 따뜻하게 맞이하고, "어떤 일이 있었어?" 처럼 부드럽게 문을 열어줘라.
절대 금지: 해결책 제시, 조언, 훈계, 길게 설명하기`

    : turn <= 7
    ? `[현재 단계: 감정 탐색 — ${turn}번째 대화]
목표: 감정의 이름 함께 찾기.
지금 해야 할 것: "언제부터?", "어떤 느낌이었어?", "가장 힘든 게 뭐야?" 처럼
감정을 깊이 탐색하는 질문 하나만 해라.
절대 금지: 해결책 제시, 비교, 판단`

    : turn <= 11
    ? `[현재 단계: 핵심 파악 — ${turn}번째 대화]
목표: 반복되는 패턴과 핵심 원인 발견.
지금 해야 할 것: "이런 일이 자주 있어?", "예전에도 비슷한 적 있었어?",
"그때 가장 힘들었던 게 뭐야?" 처럼 패턴을 확인해라.
아직 해결책 제시 금지`

    : `[현재 단계: 해결 모색 — ${turn}번째 대화]
목표: 학생 스스로 답을 찾도록 이끌기.
지금 해야 할 것: "어떻게 됐으면 좋겠어?", "선생님이 어떻게 도와줄까?",
"그 상황에서 네가 할 수 있는 게 뭐가 있을까?" 처럼
학생이 스스로 생각하고 답을 말하도록 유도해라.
절대 금지: "이렇게 해봐" 같은 지시형 해결책`;

  const toneRules = `
[말투·형식 규칙]
- 2~3문장 이내로 짧고 따뜻하게
- 이모지는 1~2개, 과하면 안 됨
- "~구나", "~겠다", "그랬어?", "맞아?" 같은 공감형 어미 사용
- 초등학생 눈높이에 맞는 쉬운 단어 사용
- 이름(${name})을 자주 불러줘서 개인적인 느낌을 줘라
- 절대 금지 표현:
  "네, 알겠습니다" / "도움이 필요하시면" / "물론이죠" / "안타깝게도"
  "저는 AI입니다" / "~해드릴게요" / "참고하세요"
`;

  const crisisRule = `
[위기 상황 감지 시 — 즉시 적용]
자해, 죽고싶다, 맞는다, 학대 관련 키워드 감지 시:
1. 먼저 따뜻하게 받아주고 혼자가 아니라는 것을 알려줘라
2. "선생님(어른)에게 직접 도움을 요청하자"고 안내해라
3. 위기상담전화 1388 안내해라
4. 대화를 절대 끊지 말고 계속 연결을 유지해라
5. "선생님이 꼭 도와줄게"로 마무리해라
`;

  return `${role}\n${readingRules}\n${stageGuide}\n${toneRules}\n${crisisRule}`;
}

// =============================================
// 위기 응답
// =============================================
function getCrisisReply(name, risk) {
  if (risk === 'high') {
    return `${name}아, 말해줘서 정말 고마워. 지금 많이 힘들구나 💙\n선생님이 네 곁에 있을게. 혼자 감당하지 않아도 돼.\n지금 바로 위기상담전화 ☎️ 1388 에 전화하거나,\n가까운 어른한테 꼭 도움을 요청해줘. 선생님이 응원할게 🌸`;
  }
  return `${name}아, 무서운 일이 있었구나 😢\n네 잘못이 절대 아니야. 선생님한테 더 자세히 말해줄 수 있어?\n어떤 일이 있었는지 하나씩 얘기해줘 💙`;
}

// =============================================
// AI 호출
// =============================================
async function callAI(userText, name, gender, grade, turn, history) {
  try {
    const systemPrompt = buildSystemPrompt(name, gender, grade, turn);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userText }
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('AI 호출 오류:', e);
    return null;
  }
}

// =============================================
// Fallback 답변
// =============================================
function getFallback(name, turn) {
  const fallbacks = [
    `${name}아, 말해줘서 고마워 😊 어떤 일이 있었는지 더 얘기해줄 수 있어?`,
    `그랬구나, ${name}아. 그때 어떤 기분이었어?`,
    `${name}이 많이 힘들었겠다. 조금 더 자세히 말해줄 수 있어? 💙`,
    `선생님이 잘 듣고 있어, ${name}아. 계속 얘기해줘 🌸`,
    `${name}아, 그 상황에서 가장 힘들었던 게 뭐야?`,
  ];
  return fallbacks[turn % fallbacks.length];
}

// =============================================
// 관리자 모달
// =============================================
function AdminModal({ onClose, onSuccess }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32,
        width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginBottom: 16, color: '#ec4899', textAlign: 'center' }}>🔐 관리자 로그인</h3>
        <input
          type="password"
          placeholder="비밀번호 입력"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (pw === ADMIN_PW) onSuccess();
              else setErr(true);
            }
          }}
          style={{
            width: '100%', padding: '10px 14px', border: `2px solid ${err ? '#ef4444' : '#fce7f3'}`,
            borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box'
          }}
        />
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>비밀번호가 틀렸어요</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 10, border: '1px solid #ddd',
            borderRadius: 10, background: '#f9f9f9', cursor: 'pointer'
          }}>취소</button>
          <button onClick={() => { if (pw === ADMIN_PW) onSuccess(); else setErr(true); }} style={{
            flex: 1, padding: 10, border: 'none',
            borderRadius: 10, background: '#ec4899', color: '#fff',
            cursor: 'pointer', fontWeight: 'bold'
          }}>확인</button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// 관리자 대시보드
// =============================================
function AdminDashboard({ logs, onClose }) {
  const total = logs.length;
  const highRisk = logs.filter(l => l.risk === 'high').length;
  const medRisk  = logs.filter(l => l.risk === 'medium').length;

  const categoryCounts = {};
  CATEGORIES.forEach(c => { categoryCounts[c.id] = 0; });
  logs.forEach(l => { if (categoryCounts[l.category] !== undefined) categoryCounts[l.category]++; });

  const topCategories = CATEGORIES
    .map(c => ({ ...c, count: categoryCounts[c.id] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  function exportCSV() {
    const header = 'ID,이름,학년,성별,카테고리,위험도,시간,메시지\n';
    const rows = logs.map((l, i) =>
      `${i + 1},${l.name},${l.grade},${l.gender},${getCategoryLabel(l.category)},${l.risk},${l.time},"${l.message.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `weeclass_logs_${new Date().toLocaleDateString('ko-KR').replace(/\. /g,'-').replace('.','')}.csv`;
    a.click();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff0f6', padding: 20 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: '#ec4899', margin: 0 }}>📊 위클래스 상담 현황</h2>
          <button onClick={onClose} style={{
            padding: '8px 16px', background: '#ec4899', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer'
          }}>← 돌아가기</button>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '전체 상담', value: total, color: '#ec4899' },
            { label: '🔴 고위험', value: highRisk, color: '#ef4444' },
            { label: '🟡 주의',   value: medRisk,  color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 14, padding: 16,
              textAlign: 'center', boxShadow: '0 2px 8px rgba(236,72,153,0.1)'
            }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 인기 카테고리 */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: 16,
          marginBottom: 20, boxShadow: '0 2px 8px rgba(236,72,153,0.1)'
        }}>
          <h3 style={{ color: '#ec4899', marginTop: 0 }}>🏆 상위 상담 주제</h3>
          {topCategories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ width: 100, fontSize: 13 }}>{c.emoji} {c.label}</span>
              <div style={{
                flex: 1, height: 12, background: '#fce7f3', borderRadius: 6, overflow: 'hidden', margin: '0 10px'
              }}>
                <div style={{
                  height: '100%', background: '#ec4899', borderRadius: 6,
                  width: `${total ? (c.count / total) * 100 : 0}%`
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#888', minWidth: 24 }}>{c.count}</span>
            </div>
          ))}
        </div>

        {/* CSV 내보내기 */}
        <button onClick={exportCSV} style={{
          width: '100%', padding: 14, background: '#10b981', color: '#fff',
          border: 'none', borderRadius: 12, fontSize: 15,
          fontWeight: 'bold', cursor: 'pointer', marginBottom: 20
        }}>📥 CSV 내보내기</button>

        {/* 최근 로그 */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: 16,
          boxShadow: '0 2px 8px rgba(236,72,153,0.1)'
        }}>
          <h3 style={{ color: '#ec4899', marginTop: 0 }}>🕐 최근 상담 기록</h3>
          {logs.length === 0 && <p style={{ color: '#aaa', textAlign: 'center' }}>아직 기록이 없어요</p>}
          {[...logs].reverse().slice(0, 20).map((l, i) => {
            const badge = getRiskBadge(l.risk);
            return (
              <div key={i} style={{
                borderBottom: '1px solid #fce7f3', paddingBottom: 10, marginBottom: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa' }}>
                  <span>{l.name} · {l.grade} · {getCategoryLabel(l.category)}</span>
                  <span style={{ color: badge.color, fontWeight: 'bold' }}>{badge.text}</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{l.message}</p>
                <span style={{ fontSize: 11, color: '#bbb' }}>{l.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================
// 성별 선택 컴포넌트
// =============================================
function GenderSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <p style={{ color: '#be185d', fontSize: 14, marginBottom: 12 }}>
        선생님이 더 잘 이해할 수 있게 알려줄래? 😊
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        {[
          { v: 'female', label: '👧 여학생', bg: '#fce7f3', bc: '#ec4899' },
          { v: 'male',   label: '👦 남학생', bg: '#eff6ff', bc: '#3b82f6' },
          { v: 'none',   label: '🤫 비밀',   bg: '#f3f4f6', bc: '#9ca3af' },
        ].map(b => (
          <button key={b.v} onClick={() => onSelect(b.v)} style={{
            padding: '8px 16px', background: b.bg, border: `2px solid ${b.bc}`,
            borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 'bold',
            color: b.bc, transition: 'transform 0.1s'
          }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >{b.label}</button>
        ))}
      </div>
    </div>
  );
}

// =============================================
// 메인 컴포넌트
// =============================================
export default function WeClassAI() {
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [grade,           setGrade]           = useState('');
  const [logs,            setLogs]            = useState([]);
  const [view,            setView]            = useState('chat');   // 'chat' | 'admin'
  const [showAdminModal,  setShowAdminModal]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [step,            setStep]            = useState('category'); // category | grade | name | gender | chat
  const [studentName,     setStudentName]     = useState('');
  const [studentGender,   setStudentGender]   = useState('');
  const [turnCount,       setTurnCount]       = useState(0);
  const [history,         setHistory]         = useState([]);
  const [selectedCat,     setSelectedCat]     = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMsg = useCallback((role, text, extra = {}) => {
    setMessages(prev => [...prev, { role, text, ...extra }]);
  }, []);

  const updateLastBot = useCallback((text) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'bot') { next[i] = { ...next[i], text }; break; }
      }
      return next;
    });
  }, []);

  // 카테고리 선택
  const handleCategoryClick = useCallback((cat) => {
    setSelectedCat(cat);
    setMessages([]);
    setHistory([]);
    setTurnCount(0);
    addMsg('bot', `${cat.emoji} **${cat.label}** 주제를 선택했구나!\n먼저 선생님한테 몇 학년인지 알려줄 수 있어? 😊`);
    setStep('grade');
  }, [addMsg]);

  // 학년 선택
  const handleGradeClick = useCallback((g) => {
    setGrade(g);
    addMsg('user', g);
    addMsg('bot', `${g}이구나! 이름은 뭐야? 편하게 불러줄게 🌸`);
    setStep('name');
  }, [addMsg]);

  // 성별 선택
  const handleGender = useCallback((g) => {
    setStudentGender(g);
    const gText = g === 'female' ? '여학생' : g === 'male' ? '남학생' : '';
    addMsg('bot', `${gText ? gText + '이구나! ' : ''}${studentName}아, 반가워 💕\n어떤 일이 있었는지 선생님한테 편하게 말해줘. 여기서 하는 이야기는 비밀이야 🔒`);
    setStep('chat');
  }, [addMsg, studentName]);

  // 메시지 전송
  const sendMessage = useCallback(async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setInput('');

    // 이름 입력 단계
    if (step === 'name') {
      const parsed = parseName(txt);
      const name   = parsed || txt.slice(0, 6);
      setStudentName(name);
      addMsg('user', txt);
      addMsg('bot', `${name}아 안녕! 반가워 😊\n선생님이 더 잘 이해할 수 있게 알려줄래?`, { showGender: true });
      setStep('gender');
      return;
    }

    if (step !== 'chat') return;

    addMsg('user', txt);
    setLoading(true);
    addMsg('bot', '...');

    const risk     = getRisk(txt);
    const category = getCategory(txt) !== 'etc' ? getCategory(txt) : (selectedCat?.id || 'etc');
    const newTurn  = turnCount + 1;
    setTurnCount(newTurn);

    // 로그 저장
    setLogs(prev => [...prev, {
      name: studentName, grade, gender: studentGender,
      category, risk, message: txt,
      time: new Date().toLocaleString('ko-KR')
    }]);

    let reply;

    // 위기 대응
    if (risk === 'high' || risk === 'medium') {
      reply = getCrisisReply(studentName, risk);
    } else {
      // AI 호출 — 전체 히스토리 전달
      const newHistory = [...history, { role: 'user', content: txt }];
      reply = await callAI(txt, studentName, studentGender, grade, newTurn, history);
      if (!reply) reply = getFallback(studentName, newTurn);
      // 히스토리 업데이트
      setHistory([...newHistory, { role: 'assistant', content: reply }]);
    }

    updateLastBot(reply);
    setLoading(false);
  }, [input, loading, step, studentName, studentGender, grade, turnCount, history, selectedCat, addMsg, updateLastBot]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  // =============================================
  // 렌더링
  // =============================================
  if (view === 'admin') {
    return <AdminDashboard logs={logs} onClose={() => setView('chat')} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff0f6 0%, #fce7f3 50%, #fff5f9 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>

      {/* 헤더 */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'linear-gradient(90deg, #ec4899, #f472b6)',
        padding: '16px 20px', borderRadius: '0 0 24px 24px',
        boxShadow: '0 4px 20px rgba(236,72,153,0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>🏫 {SCHOOL_NAME}</div>
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>💗 위클래스 AI 상담</div>
          <div style={{ color: '#fce7f3', fontSize: 12 }}>{COUNSELOR_NAME}</div>
        </div>
        <button onClick={() => setShowAdminModal(true)} style={{
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff', borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer'
        }}>관리자</button>
      </div>

      {/* 카테고리 선택 화면 */}
      {step === 'category' && (
        <div style={{ width: '100%', maxWidth: 480, padding: 20 }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 20,
            boxShadow: '0 4px 20px rgba(236,72,153,0.1)', marginBottom: 16
          }}>
            <p style={{ color: '#be185d', fontSize: 15, textAlign: 'center', marginBottom: 4, fontWeight: 'bold' }}>
              안녕! 선생님이 여기 있어 😊
            </p>
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', margin: 0 }}>
              어떤 이야기를 하고 싶어? 하나를 골라봐!
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => handleCategoryClick(cat)} style={{
                background: '#fff', border: '2px solid #fce7f3',
                borderRadius: 14, padding: '10px 4px', cursor: 'pointer',
                textAlign: 'center', fontSize: 11, color: '#be185d', fontWeight: 'bold',
                transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(236,72,153,0.08)'
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.background = '#fff0f6'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#fce7f3'; e.currentTarget.style.background = '#fff'; }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{cat.emoji}</div>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 학년 선택 */}
      {step === 'grade' && (
        <div style={{ width: '100%', maxWidth: 480, padding: '12px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {GRADES.map(g => (
              <button key={g} onClick={() => handleGradeClick(g)} style={{
                padding: '8px 18px', background: '#fff', border: '2px solid #fce7f3',
                borderRadius: 20, cursor: 'pointer', fontSize: 14, color: '#be185d', fontWeight: 'bold'
              }}>{g}</button>
            ))}
          </div>
        </div>
      )}

      {/* 채팅 메시지 영역 */}
      {(step === 'name' || step === 'gender' || step === 'chat') && (
        <div style={{
          width: '100%', maxWidth: 480, flex: 1,
          padding: '12px 16px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end', gap: 8
              }}>
                {msg.role === 'bot' && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0
                  }}>💗</div>
                )}
                <div style={{
                  maxWidth: '72%', padding: '10px 14px', borderRadius:
                    msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #ec4899, #f472b6)'
                    : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#374151',
                  fontSize: 14, lineHeight: 1.6,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>
                  {msg.text === '...'
                    ? <span style={{ letterSpacing: 4, color: '#f9a8d4' }}>●●●</span>
                    : msg.text}
                </div>
              </div>
              {/* 성별 선택 버튼 */}
              {msg.showGender && step === 'gender' && (
                <div style={{ marginLeft: 44, marginTop: 8 }}>
                  <GenderSelect onSelect={handleGender} />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* 입력창 */}
      {step === 'chat' && (
        <div style={{
          width: '100%', maxWidth: 480,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.9)',
          borderTop: '1px solid #fce7f3',
          display: 'flex', gap: 8, alignItems: 'flex-end'
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="선생님한테 편하게 말해줘 😊"
            rows={1}
            style={{
              flex: 1, padding: '10px 14px',
              border: '2px solid #fce7f3', borderRadius: 20,
              fontSize: 14, outline: 'none', resize: 'none',
              fontFamily: 'inherit', lineHeight: 1.5,
              background: '#fff'
            }}
            onFocus={e => e.target.style.borderColor = '#ec4899'}
            onBlur={e => e.target.style.borderColor = '#fce7f3'}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
            width: 44, height: 44,
            background: loading || !input.trim()
              ? '#fce7f3'
              : 'linear-gradient(135deg, #ec4899, #f472b6)',
            border: 'none', borderRadius: '50%', cursor:
              loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(236,72,153,0.3)'
          }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      )}

      {/* 이름 입력 단계 입력창 */}
      {step === 'name' && (
        <div style={{
          width: '100%', maxWidth: 480,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.9)',
          borderTop: '1px solid #fce7f3',
          display: 'flex', gap: 8
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="이름을 입력해줘 😊"
            style={{
              flex: 1, padding: '10px 14px',
              border: '2px solid #fce7f3', borderRadius: 20,
              fontSize: 14, outline: 'none'
            }}
          />
          <button onClick={sendMessage} style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #ec4899, #f472b6)',
            border: 'none', borderRadius: '50%', cursor: 'pointer',
            fontSize: 18, color: '#fff'
          }}>➤</button>
        </div>
      )}

      {/* 하단 긴급상담 안내 */}
      <div style={{
        width: '100%', maxWidth: 480,
        padding: '10px 16px',
        textAlign: 'center', fontSize: 12, color: '#9ca3af'
      }}>
        💙 위기상담 필요 시 ☎️ <strong style={{ color: '#ec4899' }}>1388</strong> (24시간)
      </div>

      {/* 관리자 모달 */}
      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={() => { setShowAdminModal(false); setView('admin'); }}
        />
      )}
    </div>
  );
}
