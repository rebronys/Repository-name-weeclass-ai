import { useState, useRef, useEffect, useCallback } from "react";

const SCHOOL_NAME = "은평초등학교";
const COUNSELOR_NAME = "김윤정";
const ADMIN_PW = "weeclass2024";
const GRADES = ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"];

const CATEGORIES = [
  { id: "friend",   label: "👫 친구 갈등",    keywords: ["친구", "사이", "싸웠", "화해", "무시"] },
  { id: "bully",    label: "😢 괴롭힘/왕따",  keywords: ["괴롭힘", "왕따", "따돌림", "때려", "욕"] },
  { id: "study",    label: "📚 공부 스트레스", keywords: ["공부", "시험", "성적", "숙제", "학원"] },
  { id: "teacher",  label: "👩‍🏫 선생님 문제",  keywords: ["선생님", "담임", "혼났"] },
  { id: "family",   label: "🏠 가족 문제",    keywords: ["엄마", "아빠", "부모", "가족", "형제", "동생"] },
  { id: "lonely",   label: "😔 외로움/우울",  keywords: ["외로워", "우울", "슬퍼", "혼자"] },
  { id: "angry",    label: "😤 화/분노",      keywords: ["화나", "짜증", "억울", "열받"] },
  { id: "anxiety",  label: "😰 불안/걱정",    keywords: ["불안", "걱정", "무서워", "두려워", "긴장"] },
  { id: "body",     label: "🤒 몸/건강",      keywords: ["아파", "두통", "배아파", "피곤"] },
  { id: "sns",      label: "📱 SNS/사이버",   keywords: ["SNS", "인스타", "카톡", "단톡"] },
  { id: "game",     label: "🎮 게임 중독",    keywords: ["게임", "유튜브", "핸드폰", "중독"] },
  { id: "love",     label: "💕 이성 친구",    keywords: ["좋아해", "짝사랑", "사귀", "고백"] },
  { id: "career",   label: "🌟 꿈/진로",      keywords: ["꿈", "장래희망", "진로"] },
  { id: "selfcare", label: "💪 자존감",       keywords: ["자신없어", "못하겠어", "열등감"] },
  { id: "violence", label: "🆘 폭력/학대",    keywords: ["맞아", "때려", "폭력", "학대"] },
  { id: "divorce",  label: "💔 부모 이혼",    keywords: ["이혼", "별거", "부모싸움"] },
  { id: "move",     label: "🏫 전학/적응",    keywords: ["전학", "새학교", "적응"] },
  { id: "burden",   label: "📝 학업 부담",    keywords: ["숙제많아", "공부너무많아", "학원많아"] },
  { id: "sleep",    label: "😴 수면/피로",    keywords: ["못자", "피곤해", "졸려", "잠"] },
  { id: "etc",      label: "💬 기타 고민",    keywords: [] },
];

const HIGH_RISK = ["죽고싶", "자해", "유서", "자살", "죽고 싶", "죽어버리고", "폭력", "학대", "때려", "맞아", "칼"];
const MEDIUM_RISK = ["우울", "불안", "괴롭힘", "왕따", "힘들어", "외로워", "무서워", "못살겠", "슬퍼", "울고싶"];

const getRisk = (txt) => {
  let s = 0;
  HIGH_RISK.forEach(w => txt.includes(w) && (s += 3));
  MEDIUM_RISK.forEach(w => txt.includes(w) && (s += 1));
  return s;
};

const getCategory = (txt) => {
  for (const c of CATEGORIES) {
    if (c.keywords.some(k => txt.includes(k))) return c.id;
  }
  return "etc";
};

const getCategoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || id;

const getRiskBadge = (sc) =>
  sc >= 3
    ? { label: "🔴 고위험", color: "#dc2626", bg: "#fef2f2" }
    : sc >= 1
    ? { label: "🟡 주의", color: "#d97706", bg: "#fffbeb" }
    : { label: "🟢 일반", color: "#16a34a", bg: "#f0fdf4" };

const parseName = (txt) => {
  const cleaned = txt
    .replace(/저는|제|이름은|이에요|예요|입니다|이라고|라고|해요|야|이야|은|는|이|가/g, "")
    .replace(/[^가-힣a-zA-Z]/g, "")
    .trim();
  return cleaned.length >= 1 ? cleaned.substring(0, 6) : txt.trim().substring(0, 6);
};

const buildSystemPrompt = (name, gender, grade, turn) => {
  const genderText = gender === "여학생" ? "여학생" : gender === "남학생" ? "남학생" : "학생";
  const turnGuide =
    turn <= 3
      ? "지금은 라포 형성 단계야. 학생이 편안함을 느끼도록 따뜻하게 공감해줘."
      : turn <= 6
      ? "지금은 감정 탐색 단계야. 더 깊이 들어가서 어떤 상황인지 자연스럽게 물어봐."
      : turn <= 9
      ? "지금은 해결 모색 단계야. 학생 스스로 해결책을 찾을 수 있도록 부드럽게 도와줘."
      : "지금은 마무리 단계야. 선생님과 직접 만나서 이야기하면 더 잘 도울 수 있다고 자연스럽게 연결해줘.";

  return `당신은 ${SCHOOL_NAME} 위클래스 전문상담교사 ${COUNSELOR_NAME} 선생님입니다.

## 상담 대상
- 이름: ${name || "학생"}
- 학년: ${grade}
- 성별: ${genderText}

## 말투 규칙 (매우 중요!)
- 초등학생 수준에 맞는 쉬운 단어 사용
- 반드시 "${name || "친구"}아" 또는 "${name || "친구"}, " 로 시작해서 이름을 불러줘
- 엄마처럼 따뜻하고 부드러운 말투로 대화해
- 한 번에 2~3문장으로 짧게 답해줘
- 한 번에 질문은 1개만 해줘
- 이모지를 1~2개 자연스럽게 사용해

## 상담 단계 지침
${turnGuide}

## 절대 하면 안 되는 것
- 진단이나 의학적 판단 금지
- 부모님이나 선생님 비판 금지
- 학생 탓하는 말 금지
- 너무 긴 설명 금지

## 위기 상황 시
자해, 자살, 폭력 언급이 나오면 즉시 다음을 안내해:
"선생님한테 지금 바로 알려야 해. 청소년 전화 1388이나 자살예방상담 1393에 전화하면 바로 도움받을 수 있어 💙"`;
};

const getCrisisReply = (name) => {
  const n = name || "친구";
  return `${n}아, 선생님이 지금 정말 많이 걱정돼 💙\n\n네가 힘든 마음을 말해줘서 고마워. 혼자 이런 생각을 품고 있었구나.\n\n지금 바로 연락해줘:\n📞 청소년 전화 1388 (24시간, 무료)\n📞 자살예방상담 1393 (24시간, 무료)\n📞 긴급신고 112\n\n선생님도 꼭 알려줘야 해. 네 곁에 항상 있을게 💙`;
};

async function callAI(userText, name, gender, grade, turn, hist) {
  try {
    const systemPrompt = buildSystemPrompt(name, gender, grade, turn);
    const messages = [
      { role: "system", content: systemPrompt },
      ...hist,
      { role: "user", content: userText },
    ];
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("callAI 오류:", error.message);
    return null;
  }
}

const getFallback = (name, turn) => {
  const n = name || "친구";
  const responses = [
    `${n}아, 이야기해줘서 고마워 😊 어떤 일이 있었는지 조금 더 말해줄 수 있어?`,
    `${n}아, 그랬구나 💙 많이 힘들었겠다. 어떤 부분이 제일 힘들어?`,
    `${n}아, 선생님이 네 마음을 이해해 😊 같이 생각해볼까?`,
    `${n}아, 정말 고생했어 💙 선생님이랑 직접 이야기하면 더 잘 도울 수 있어. 상담 신청해볼래?`,
  ];
  const idx = Math.min(Math.floor((turn - 1) / 3), responses.length - 1);
  return responses[idx];
};

function AdminModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#374151" }}>🔒 관리자 로그인</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>비밀번호를 입력해주세요</p>
        <input
          type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { if (pw === ADMIN_PW) onSuccess(); else setErr("비밀번호가 틀렸습니다"); } }}
          placeholder="비밀번호 입력"
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 8 }}
          autoFocus
        />
        {err && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { if (pw === ADMIN_PW) onSuccess(); else setErr("비밀번호가 틀렸습니다"); }}
            style={{ flex: 1, padding: "10px", background: "#f472b6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>확인</button>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer" }}>취소</button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ logs, onBack }) {
  const total = logs.length;
  const highRisk = logs.filter(l => l.risk >= 3).length;
  const midRisk = logs.filter(l => l.risk >= 1 && l.risk < 3).length;
  const gradeCounts = {};
  GRADES.forEach(g => { gradeCounts[g] = logs.filter(l => l.grade === g).length; });
  const catCounts = {};
  CATEGORIES.forEach(c => { catCounts[c.id] = logs.filter(l => l.category === c.id).length; });

  const exportCSV = () => {
    const header = "시간,학년,성별,카테고리,위험도,질문,답변\n";
    const rows = logs.map(l =>
      `"${l.time}","${l.grade}","${l.gender || ""}","${getCategoryLabel(l.category)}","${l.risk}","${l.question.replace(/"/g, "'")}","${l.answer.replace(/"/g, "'")}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "weeclass_logs.csv"; a.click();
  };

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>← 뒤로</button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#374151" }}>📊 관리자 대시보드</h2>
        <button onClick={exportCSV} style={{ marginLeft: "auto", padding: "8px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>CSV 내보내기</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "전체 상담", value: total, color: "#3b82f6", bg: "#eff6ff" },
          { label: "고위험", value: highRisk, color: "#dc2626", bg: "#fef2f2" },
          { label: "주의", value: midRisk, color: "#d97706", bg: "#fffbeb" },
        ].map((item, i) => (
          <div key={i} style={{ background: item.bg, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{item.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#374151" }}>학년별 상담 현황</h3>
        {GRADES.map(g => (
          <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, width: 40, color: "#6b7280" }}>{g}</span>
            <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 16, overflow: "hidden" }}>
              <div style={{ width: total ? `${(gradeCounts[g] / total) * 100}%` : "0%", background: "#f472b6", height: "100%", borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 12, color: "#374151", width: 20 }}>{gradeCounts[g]}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#374151" }}>카테고리별 현황</h3>
        {CATEGORIES.filter(c => (catCounts[c.id] || 0) > 0).map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, width: 90, color: "#6b7280" }}>{c.label}</span>
            <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 14, overflow: "hidden" }}>
              <div style={{ width: `${((catCounts[c.id] || 0) / total) * 100}%`, background: "#a78bfa", height: "100%", borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 12, color: "#374151", width: 16 }}>{catCounts[c.id] || 0}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#374151" }}>최근 상담 로그</h3>
        {logs.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13 }}>아직 상담 기록이 없습니다</p>}
        {[...logs].reverse().slice(0, 10).map((log, i) => {
          const badge = getRiskBadge(log.risk);
          return (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: badge.bg, marginBottom: 8, border: `1px solid ${badge.color}22` }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{log.time}</span>
                <span style={{ fontSize: 11, background: "#e5e7eb", borderRadius: 4, padding: "1px 6px" }}>{log.grade}</span>
                {log.gender && <span style={{ fontSize: 11, background: "#fce7f3", borderRadius: 4, padding: "1px 6px" }}>{log.gender}</span>}
                <span style={{ fontSize: 11, color: badge.color, fontWeight: 600 }}>{badge.label}</span>
              </div>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: "#374151" }}>Q: {log.question.substring(0, 40)}...</p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>A: {log.answer.substring(0, 50)}...</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenderSelect({ name, onSelect }) {
  return (
    <div style={{ padding: "16px 0" }}>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#374151", textAlign: "center" }}>
        {name}아, 선생님이 더 잘 이해할 수 있게<br />어떤 친구인지 알려줄 수 있어? 😊
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {[
          { label: "👧 여학생", value: "여학생", bg: "#fce7f3", border: "#f9a8d4" },
          { label: "👦 남학생", value: "남학생", bg: "#dbeafe", border: "#93c5fd" },
          { label: "🌟 비밀", value: "비밀", bg: "#f3f4f6", border: "#d1d5db" },
        ].map(btn => (
          <button key={btn.value} onClick={() => onSelect(btn.value)}
            style={{ padding: "12px 18px", background: btn.bg, border: `2px solid ${btn.border}`, borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PinkBackground = () => (
  <svg viewBox="0 0 480 850" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: "100%", zIndex: 0, opacity: 0.15 }}>
    <rect width="480" height="850" fill="#fce7f3" />
    {[[60,80],[150,40],[280,100],[400,60],[100,200],[350,180],[200,300],[440,250],[30,350],[320,400],[140,450],[410,500],[80,580],[260,550],[380,620]].map(([x,y],i) => (
      <g key={i} transform={`translate(${x},${y})`}>
        {[0,72,144,216,288].map((angle,j) => (
          <ellipse key={j} cx={Math.cos((angle*Math.PI)/180)*8} cy={Math.sin((angle*Math.PI)/180)*8}
            rx="6" ry="4" fill={i%3===0?"#f9a8d4":i%3===1?"#fda4af":"#fbcfe8"}
            transform={`rotate(${angle})`} opacity="0.7" />
        ))}
        <circle cx="0" cy="0" r="2.5" fill="#fbbf24" />
      </g>
    ))}
  </svg>
);

const SchoolLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="19" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2" />
    <polygon points="20,6 32,14 32,30 8,30 8,14" fill="#f472b6" opacity="0.8" />
    <rect x="16" y="22" width="8" height="8" fill="#fff" opacity="0.9" />
    <rect x="10" y="16" width="5" height="5" fill="#fff" opacity="0.7" />
    <rect x="25" y="16" width="5" height="5" fill="#fff" opacity="0.7" />
    <text x="20" y="12" textAnchor="middle" fontSize="5" fill="#fff" fontWeight="bold">은평</text>
  </svg>
);

export default function WeClassAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [grade, setGrade] = useState("3학년");
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("chat");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("idle");
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [history, setHistory] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const addMsg = useCallback((user, bot, isAlert = false) => {
    setMessages(prev => [...prev, { user, bot, isAlert }]);
  }, []);

  const updateLastBot = useCallback((bot, isAlert = false) => {
    setMessages(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = { ...updated[updated.length - 1], bot, isAlert };
      }
      return updated;
    });
  }, []);

  const handleCategoryClick = useCallback((categoryLabel) => {
    if (loading || step !== "idle") return;
    setMessages([]);
    setStep("asked_name");
    setTurnCount(0);
    setHistory([]);
    setStudentName("");
    setStudentGender("");
    const greeting = `안녕! 😊 나는 ${SCHOOL_NAME} 위클래스 상담선생님 **${COUNSELOR_NAME}**이야.\n\n**${categoryLabel}** 에 대해 이야기하고 싶구나. 선생님이 잘 들을게 💙\n\n먼저 네 이름을 알려줄 수 있어? 실명이 불편하면 별명이나 닉네임도 괜찮아!`;
    addMsg(categoryLabel, greeting);
  }, [loading, step, addMsg]);

  const handleGender = useCallback((gender) => {
    setStudentGender(gender);
    setStep("counseling");
    const emoji = gender === "여학생" ? "👧" : gender === "남학생" ? "👦" : "🌟";
    const reply = `${emoji} 알겠어! 이제 진짜 이야기를 해볼까?\n\n${studentName}아, 어떤 일이 있었는지 선생님한테 편하게 말해줘. 여기서 하는 이야기는 선생님만 알고 있을게 💙`;
    addMsg(`${gender} 선택`, reply);
  }, [studentName, addMsg]);

  // eslint-disable-next-line
  const sendMessage = useCallback(async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { user: txt, bot: null }]);
    await new Promise(r => setTimeout(r, 800));

    try {
      if (step === "asked_name") {
        const name = parseName(txt);
        setStudentName(name);
        setStep("asked_gender");
        const reply = `${name}아, 반가워! 😊 선생님이 ${name}이 이야기를 잘 들을게.`;
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, bot: reply, genderSelect: true, genderName: name } : m
        ));
      } else if (step === "counseling") {
        const riskScore = getRisk(txt);
        const cat = getCategory(txt);
        const newTurn = turnCount + 1;
        setTurnCount(newTurn);
        let reply;
        let isAlert = false;
        if (riskScore >= 3) {
          reply = getCrisisReply(studentName);
          isAlert = true;
        } else {
          const newHist = [...history, { role: "user", content: txt }];
          const aiReply = await callAI(txt, studentName, studentGender, grade, newTurn, history);
          reply = aiReply || getFallback(studentName, newTurn);
          if (aiReply) {
            setHistory([...newHist, { role: "assistant", content: aiReply }]);
          }
        }
        updateLastBot(reply, isAlert);
        setLogs(prev => [...prev, {
          grade, gender: studentGender, category: cat,
          risk: riskScore, question: txt, answer: reply,
          studentName, time: new Date().toLocaleString("ko-KR"),
        }]);
      } else {
        updateLastBot("안녕! 위에서 상담 주제를 먼저 선택해줘 😊");
      }
    } catch (err) {
      console.error("sendMessage 오류:", err);
      updateLastBot(getFallback(studentName, turnCount));
    } finally {
      setLoading(false);
    }
  }, [input, loading, step, studentName, studentGender, grade, turnCount, history, updateLastBot]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (view === "admin") {
    return (
      <div style={{ minHeight: "100vh", background: "#fdf2f8" }}>
        <PinkBackground />
        <div style={{ position: "relative", zIndex: 1 }}>
          <AdminDashboard logs={logs} onBack={() => setView("chat")} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fdf2f8", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PinkBackground />
      {showAdminModal && (
        <AdminModal
          onSuccess={() => { setShowAdminModal(false); setView("admin"); }}
          onClose={() => setShowAdminModal(false)}
        />
      )}
      <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #fce7f3", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
          <SchoolLogo size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#be185d" }}>{SCHOOL_NAME}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>위클래스 AI 상담 · {COUNSELOR_NAME} 선생님</div>
          </div>
          <select value={grade} onChange={e => setGrade(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #fce7f3", borderRadius: 8, fontSize: 13, background: "#fff", color: "#374151", cursor: "pointer" }}>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={() => setShowAdminModal(true)}
            style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #fce7f3", background: "#fff", cursor: "pointer", fontSize: 16 }}>🔒</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {step === "idle" && (
            <div>
              <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center", boxShadow: "0 4px 20px rgba(244,114,182,0.15)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌸</div>
                <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#be185d" }}>안녕하세요! 💙</h2>
                <p style={{ margin: "0 0 4px", fontSize: 14, color: "#374151" }}>저는 <strong>{COUNSELOR_NAME}</strong> 선생님이에요</p>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>어떤 고민이든 편하게 이야기해요</p>
              </div>
              <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>어떤 주제로 이야기할까요?</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => handleCategoryClick(cat.label)}
                    style={{ padding: "12px 8px", background: "rgba(255,255,255,0.9)", border: "1.5px solid #fce7f3", borderRadius: 12, cursor: "pointer", fontSize: 13, color: "#374151", textAlign: "center", fontWeight: 500, boxShadow: "0 2px 8px rgba(244,114,182,0.1)" }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <div style={{ maxWidth: "75%", padding: "10px 14px", background: "linear-gradient(135deg, #f472b6, #ec4899)", color: "#fff", borderRadius: "18px 18px 4px 18px", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", boxShadow: "0 2px 8px rgba(244,114,182,0.3)" }}>
                  {msg.user}
                </div>
              </div>
              {msg.genderSelect && step === "asked_gender" && (
                <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 16, marginBottom: 6, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                  <GenderSelect name={msg.genderName || studentName} onSelect={handleGender} />
                </div>
              )}
              {msg.bot !== null && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👩‍🏫</div>
                  <div style={{ maxWidth: "78%", padding: "12px 14px", background: msg.isAlert ? "#fef2f2" : "rgba(255,255,255,0.97)", border: msg.isAlert ? "2px solid #fca5a5" : "1px solid #fce7f3", borderRadius: "4px 18px 18px 18px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#374151", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                    {msg.bot}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👩‍🏫</div>
              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.97)", border: "1px solid #fce7f3", borderRadius: "4px 18px 18px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#f9a8d4", animation: "bounce 1s infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {step !== "idle" && step !== "asked_gender" && (
          <div style={{ background: "rgba(255,255,255,0.97)", borderTop: "1px solid #fce7f3", padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-end", position: "sticky", bottom: 0 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={step === "asked_name" ? "이름을 알려주세요 😊" : "선생님한테 편하게 이야기해줘 💙"}
              disabled={loading} rows={1}
              style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #fce7f3", borderRadius: 20, fontSize: 14, resize: "none", outline: "none", background: loading ? "#f9fafb" : "#fff", lineHeight: 1.4, maxHeight: 100, overflow: "auto" }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              style={{ width: 44, height: 44, borderRadius: "50%", background: loading || !input.trim() ? "#f3f4f6" : "linear-gradient(135deg, #f472b6, #ec4899)", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: 18, color: loading || !input.trim() ? "#9ca3af" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              💬
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "8px", fontSize: 11, color: "#9ca3af", background: "rgba(255,255,255,0.8)" }}>
          긴급상담: 청소년전화 <strong>1388</strong> · 자살예방 <strong>1393</strong>
        </div>
      </div>
    </div>
  );
}
