import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────
// ✅ 학교 정보 설정
// ─────────────────────────────────────────
const SCHOOL_NAME    = "은평초등학교";
const COUNSELOR_NAME = "김윤정";
const ADMIN_PW       = "weeclass2024";
const GRADES         = ["1학년","2학년","3학년","4학년","5학년","6학년"];

// ✅ 상담 카테고리 20가지 - 자유롭게 추가/수정 가능
const CATEGORIES = [
  { id:"friend",    label:"친구와 싸웠어요 😢",      value:"친구와 싸웠어요",      keywords:["친구","사이","싸움","싸웠","화해"] },
  { id:"bully",     label:"괴롭힘을 당해요 😰",      value:"괴롭힘을 당해요",      keywords:["왕따","괴롭","따돌","무리","패거리"] },
  { id:"study",     label:"공부가 힘들어요 📚",      value:"공부가 힘들어요",      keywords:["시험","성적","공부","숙제","수업"] },
  { id:"school",    label:"학교가 가기 싫어요 🏫",   value:"학교가 가기 싫어요",   keywords:["학교","가기싫","등교","결석"] },
  { id:"teacher",   label:"선생님이 무서워요 👩‍🏫",   value:"선생님이 무서워요",    keywords:["선생님","교사","혼났","꾸중"] },
  { id:"family",    label:"집에서 힘들어요 🏠",      value:"집에서 힘들어요",      keywords:["부모","엄마","아빠","가족","집"] },
  { id:"sibling",   label:"형제자매와 싸워요 👫",    value:"형제자매와 싸워요",    keywords:["형","동생","언니","오빠","누나"] },
  { id:"lonely",    label:"외롭고 쓸쓸해요 😔",     value:"외롭고 쓸쓸해요",     keywords:["외로","혼자","쓸쓸","아무도"] },
  { id:"angry",     label:"화가 많이 나요 😤",       value:"화가 많이 나요",       keywords:["화","짜증","열받","억울","화남"] },
  { id:"sad",       label:"너무 슬퍼요 😭",          value:"너무 슬퍼요",          keywords:["슬퍼","울고","눈물","슬프"] },
  { id:"anxious",   label:"걱정이 너무 많아요 😟",   value:"걱정이 너무 많아요",   keywords:["걱정","불안","두려","겁나","무서"] },
  { id:"body",      label:"몸이 자꾸 아파요 🤒",     value:"몸이 자꾸 아파요",     keywords:["아파","배","머리","몸","병원"] },
  { id:"sleep",     label:"잠을 못 자요 😴",         value:"잠을 못 자요",         keywords:["잠","수면","밤","꿈","악몽"] },
  { id:"eat",       label:"밥을 못 먹겠어요 🍚",     value:"밥을 못 먹겠어요",     keywords:["밥","먹기","식욕","음식","배고"] },
  { id:"game",      label:"게임을 끊을 수가 없어요 🎮", value:"게임을 끊을 수가 없어요", keywords:["게임","유튜브","핸드폰","스마트폰"] },
  { id:"sns",       label:"SNS 때문에 힘들어요 📱",  value:"SNS 때문에 힘들어요",  keywords:["인스타","유튜브","틱톡","댓글","SNS"] },
  { id:"love",      label:"좋아하는 친구가 생겼어요 💕", value:"좋아하는 친구가 생겼어요", keywords:["좋아","설레","사귀","고백","짝사랑"] },
  { id:"future",    label:"꿈이 없어서 걱정돼요 🌟", value:"꿈이 없어서 걱정돼요", keywords:["꿈","미래","장래","직업","하고싶"] },
  { id:"confidence",label:"자신감이 없어요 💪",      value:"자신감이 없어요",      keywords:["자신감","못해","나쁜","바보","못났"] },
  { id:"etc",       label:"그냥 힘들어요 🌈",        value:"그냥 힘들어요",        keywords:["힘들","모르겠","그냥","뭔가"] },
];

const HIGH_RISK   = ["죽고싶","자해","유서","자살","죽고 싶","죽어버리고","폭력","학대","때려","맞아","칼"];
const MEDIUM_RISK = ["우울","불안","괴롭힘","왕따","힘들어","외로워","무서워","못살겠","슬퍼","울고싶"];

const getRisk = (text) => {
  let score = 0;
  HIGH_RISK.forEach((w)   => text.includes(w) && (score += 3));
  MEDIUM_RISK.forEach((w) => text.includes(w) && (score += 1));
  return score;
};

const getCategory = (text) => {
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((k) => text.includes(k))) return cat.id;
  }
  return "etc";
};

const getCategoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label.split(" ")[0] || id;

const getRiskBadge = (score) => {
  if (score >= 3) return { label:"🔴 고위험", color:"#dc2626", bg:"#fef2f2" };
  if (score >= 1) return { label:"🟡 주의",   color:"#d97706", bg:"#fffbeb" };
  return            { label:"🟢 일반",   color:"#16a34a", bg:"#f0fdf4" };
};

// ─────────────────────────────────────────
// ✅ 시스템 프롬프트
// ─────────────────────────────────────────
const buildSystemPrompt = (name, gender, grade, turnCount) => `
당신은 ${SCHOOL_NAME} 위클래스 전문상담교사 ${COUNSELOR_NAME}입니다.

【현재 학생 정보】
- 이름(또는 별명): ${name || "친구"}
- 성별: ${gender || "미확인"}
- 학년: ${grade}
- 현재 대화 횟수: ${turnCount}번째 대화

【말투 & 표현 규칙】
- 초등학생이 이해할 수 있는 쉬운 단어만 사용
- 한 번에 질문은 반드시 1개만 할 것
- 문장은 짧게 2~4줄 이내
- 반드시 ${name || "친구"}의 이름을 자연스럽게 불러줄 것
- ${gender === "여학생" ? "언니처럼 따뜻하고 다정한 말투" : gender === "남학생" ? "형처럼 친근하고 든든한 말투" : "따뜻하고 친근한 말투"}
- 이모지를 자연스럽게 1~2개 사용
- "~구나", "~겠다", "~이야" 어미를 자연스럽게 섞어 사용

【상담 단계별 행동 지침】
▶ 1~3번째 대화: 감정 공감에 집중, 해결책 제시 금지
▶ 4~6번째 대화: 상황을 구체적으로 하나씩 탐색
▶ 7~9번째 대화: 선택지 2~3개를 부드럽게 제시
▶ 10번째 이후: 위클래스 상담실 직접 방문을 자연스럽게 유도

【절대 금지】
- 진단/판단하는 표현
- 부모님/선생님 비판
- 공감 없이 해결책만 제시
- 여러 질문 동시에 하기
- "AI입니다" 표현
`;

const getCrisisReply = (name, gender) => {
  const n = name || "친구";
  return `${n}아, 선생님이 지금 많이 걱정돼 💙\n\n지금 바로 도움받을 수 있어:\n\n📞 자살예방상담전화: 1393 (24시간)\n📞 청소년상담전화: 1388\n📞 긴급구조: 112\n\n위클래스 상담실로 와줘도 되고\n담임선생님한테 말해줘도 괜찮아.\n\n${n}아, 혼자 견디지 않아도 돼 💕`;
};

// ─────────────────────────────────────────
// ✅ 성별 선택 컴포넌트
// ─────────────────────────────────────────
function GenderSelect({ name, onSelect }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.92)", borderRadius:20, padding:"20px 16px", margin:"8px 0", boxShadow:"0 4px 20px rgba(236,72,153,0.15)", border:"1px solid #fce7f3", textAlign:"center" }}>
      <div style={{ fontSize:24, marginBottom:6 }}>👋</div>
      <div style={{ fontSize:14, fontWeight:"bold", color:"#374151", marginBottom:4 }}>
        {name}아, 반가워요!
      </div>
      <div style={{ fontSize:12, color:"#6b7280", marginBottom:16, lineHeight:1.7 }}>
        선생님이 더 잘 도와드릴 수 있도록<br/>어떻게 불러드릴까요? 😊
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        {[
          { value:"여학생", emoji:"👧", color:"#ec4899", bg:"#fdf2f8", border:"#fbcfe8" },
          { value:"남학생", emoji:"👦", color:"#3b82f6", bg:"#eff6ff", border:"#bfdbfe" },
          { value:"비밀",   emoji:"🌟", color:"#f97316", bg:"#fff7ed", border:"#fed7aa" },
        ].map((g) => (
          <button key={g.value} onClick={() => onSelect(g.value)}
            style={{ flex:1, padding:"14px 8px", borderRadius:14, border:`2px solid ${g.border}`, background:g.bg, cursor:"pointer", fontFamily:"inherit", transition:"transform 0.1s" }}>
            <div style={{ fontSize:26, marginBottom:4 }}>{g.emoji}</div>
            <div style={{ fontSize:12, fontWeight:"bold", color:g.color }}>{g.value}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ✅ 관리자 모달
// ─────────────────────────────────────────
function AdminModal({ onSuccess, onClose }) {
  const [pw, setPw]   = useState("");
  const [err, setErr] = useState("");
  const check = () => pw === ADMIN_PW ? onSuccess() : setErr("비밀번호가 틀렸습니다.");
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999 }}>
      <div style={{ background:"#fff",padding:28,borderRadius:20,width:290,boxShadow:"0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin:"0 0 4px",fontSize:17 }}>🔒 관리자 인증</h3>
        <p style={{ margin:"0 0 14px",fontSize:12,color:"#9ca3af" }}>상담교사 전용 페이지입니다</p>
        <input type="password" placeholder="비밀번호 입력" value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key==="Enter" && check()} autoFocus
          style={{ width:"100%",padding:"10px 12px",border:"1px solid #ddd",borderRadius:10,fontSize:14,boxSizing:"border-box",marginBottom:6 }}
        />
        {err && <p style={{ color:"#dc2626",fontSize:12,margin:"0 0 8px" }}>{err}</p>}
        <div style={{ display:"flex",gap:8,justifyContent:"flex-end",marginTop:10 }}>
          <button onClick={onClose} style={{ padding:"9px 18px",borderRadius:10,border:"1px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:13 }}>취소</button>
          <button onClick={check} style={{ padding:"9px 18px",borderRadius:10,border:"none",background:"#ec4899",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:"bold" }}>확인</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ✅ 관리자 대시보드
// ─────────────────────────────────────────
function AdminDashboard({ logs, onBack }) {
  const total      = logs.length;
  const riskHigh   = logs.filter((l) => l.risk >= 3).length;
  const riskMed    = logs.filter((l) => l.risk >= 1 && l.risk < 3).length;
  const catStats   = logs.reduce((acc,cur) => { acc[cur.category]=(acc[cur.category]||0)+1; return acc; }, {});
  const gradeStats = logs.reduce((acc,cur) => { acc[cur.grade]=(acc[cur.grade]||0)+1; return acc; }, {});
  const genderStats= logs.reduce((acc,cur) => { acc[cur.gender]=(acc[cur.gender]||0)+1; return acc; }, {});

  const exportCSV = () => {
    const bom    = "\uFEFF";
    const header = "시간,학년,성별,학생이름,카테고리,위험도,질문내용\n";
    const rows   = logs.map((l) =>
      `"${l.time}","${l.grade}","${l.gender||"-"}","${l.studentName||"익명"}","${getCategoryLabel(l.category)}","${l.risk>=3?"고위험":l.risk>=1?"주의":"일반"}","${l.question.replace(/"/g,"'")}"`
    ).join("\n");
    const blob = new Blob([bom+header+rows],{type:"text/csv;charset=utf-8;"});
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `weeclass_${new Date().toLocaleDateString("ko-KR")}.csv`;
    a.click();
  };

  return (
    <div style={{ height:"100dvh",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",background:"#fff0f6" }}>
      <div style={{ background:"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
        <div>
          <div style={{ fontWeight:"bold",fontSize:16 }}>📊 관리자 대시보드</div>
          <div style={{ fontSize:11,opacity:0.8,marginTop:1 }}>{SCHOOL_NAME} · {COUNSELOR_NAME} 선생님</div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={exportCSV} disabled={total===0}
            style={{ padding:"6px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.4)",background:"transparent",color:"#fff",cursor:"pointer",fontSize:12,opacity:total===0?0.5:1 }}>
            📥 CSV
          </button>
          <button onClick={onBack}
            style={{ padding:"6px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.4)",background:"transparent",color:"#fff",cursor:"pointer",fontSize:12 }}>
            ← 상담으로
          </button>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px 12px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14 }}>
          {[
            { label:"전체 상담",value:total,  color:"#ec4899",bg:"#fdf2f8",icon:"💬" },
            { label:"고위험",  value:riskHigh,color:"#dc2626",bg:"#fef2f2",icon:"🔴" },
            { label:"주의",    value:riskMed, color:"#d97706",bg:"#fffbeb",icon:"🟡" },
          ].map((c) => (
            <div key={c.label} style={{ background:c.bg,borderRadius:14,padding:"14px 8px",textAlign:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:20,marginBottom:4 }}>{c.icon}</div>
              <div style={{ fontSize:26,fontWeight:"bold",color:c.color }}>{c.value}</div>
              <div style={{ fontSize:10,color:"#666",marginTop:3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:13,fontWeight:"bold",color:"#374151",marginBottom:12 }}>👥 성별 현황</div>
          <div style={{ display:"flex",gap:10 }}>
            {[
              { key:"여학생",emoji:"👧",color:"#ec4899",bg:"#fdf2f8" },
              { key:"남학생",emoji:"👦",color:"#3b82f6",bg:"#eff6ff" },
              { key:"비밀",  emoji:"🌟",color:"#f97316",bg:"#fff7ed" },
            ].map((g) => (
              <div key={g.key} style={{ flex:1,textAlign:"center",background:g.bg,borderRadius:10,padding:"10px 4px" }}>
                <div style={{ fontSize:20 }}>{g.emoji}</div>
                <div style={{ fontSize:18,fontWeight:"bold",color:g.color }}>{genderStats[g.key]||0}</div>
                <div style={{ fontSize:10,color:"#6b7280",marginTop:2 }}>{g.key}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:13,fontWeight:"bold",color:"#374151",marginBottom:12 }}>📚 학년별 현황</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6 }}>
            {GRADES.map((g) => (
              <div key={g} style={{ textAlign:"center",background:"#fdf2f8",borderRadius:10,padding:"8px 4px" }}>
                <div style={{ fontSize:16,fontWeight:"bold",color:"#ec4899" }}>{gradeStats[g]||0}</div>
                <div style={{ fontSize:9,color:"#6b7280",marginTop:2 }}>{g}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:13,fontWeight:"bold",color:"#374151",marginBottom:12 }}>📂 카테고리 분포</div>
          {total===0 ? (
            <div style={{ textAlign:"center",color:"#9ca3af",padding:"12px 0",fontSize:13 }}>상담 기록이 없습니다</div>
          ) : (
            Object.entries(catStats).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4 }}>
                  <span>{getCategoryLabel(k)}</span>
                  <span style={{ color:"#6b7280" }}>{v}건 ({Math.round((v/total)*100)}%)</span>
                </div>
                <div style={{ height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${(v/total)*100}%`,background:"linear-gradient(90deg,#ec4899,#db2777)",borderRadius:4 }}/>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.07)" }}>
          <div style={{ padding:"14px 16px",borderBottom:"1px solid #f3f4f6",fontSize:13,fontWeight:"bold",color:"#374151" }}>
            🗂 상담 로그 (최신순)
          </div>
          {total===0 ? (
            <p style={{ textAlign:"center",color:"#aaa",padding:24,margin:0,fontSize:13 }}>로그가 없습니다</p>
          ) : (
            <div style={{ maxHeight:300,overflowY:"auto" }}>
              {[...logs].reverse().map((log,i) => {
                const badge = getRiskBadge(log.risk);
                return (
                  <div key={i} style={{ padding:"12px 16px",borderBottom:"1px solid #fafafa" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:10,color:"#9ca3af" }}>{log.time}</span>
                      <span style={{ fontSize:10,fontWeight:"bold",color:badge.color,background:badge.bg,padding:"2px 8px",borderRadius:20 }}>{badge.label}</span>
                    </div>
                    <div style={{ fontSize:11,color:"#6b7280",marginBottom:3 }}>
                      {log.grade} · {log.gender||"-"} · {log.studentName||"익명"} · {getCategoryLabel(log.category)}
                    </div>
                    <div style={{ fontSize:12,color:"#374151" }}>{log.question.length>65?log.question.slice(0,65)+"…":log.question}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ height:20 }}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ✅ 분홍 배경 SVG (외부 이미지 대체)
// ─────────────────────────────────────────
const PinkBackground = () => (
  <svg style={{ position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none" }}
    viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
        <stop offset="0%"   stopColor="#fff0f6"/>
        <stop offset="60%"  stopColor="#fce7f3"/>
        <stop offset="100%" stopColor="#fbcfe8"/>
      </radialGradient>
    </defs>
    {/* 배경 */}
    <rect width="480" height="900" fill="url(#bgGrad)"/>

    {/* 하늘 */}
    <rect width="480" height="420" fill="#fdf2f8" opacity="0.6"/>

    {/* 구름 */}
    <ellipse cx="80"  cy="70"  rx="55" ry="25" fill="white" opacity="0.8"/>
    <ellipse cx="110" cy="60"  rx="40" ry="20" fill="white" opacity="0.8"/>
    <ellipse cx="50"  cy="65"  rx="32" ry="18" fill="white" opacity="0.7"/>
    <ellipse cx="370" cy="100" rx="50" ry="22" fill="white" opacity="0.7"/>
    <ellipse cx="400" cy="92"  rx="36" ry="18" fill="white" opacity="0.7"/>
    <ellipse cx="345" cy="96"  rx="30" ry="16" fill="white" opacity="0.6"/>

    {/* 태양 */}
    <circle cx="420" cy="55" r="28" fill="#fde68a" opacity="0.6"/>
    <circle cx="420" cy="55" r="20" fill="#fbbf24" opacity="0.4"/>
    {[0,45,90,135,180,225,270,315].map((deg,i) => (
      <line key={i}
        x1={420+Math.cos(deg*Math.PI/180)*31} y1={55+Math.sin(deg*Math.PI/180)*31}
        x2={420+Math.cos(deg*Math.PI/180)*42} y2={55+Math.sin(deg*Math.PI/180)*42}
        stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    ))}

    {/* 벚꽃 나무 왼쪽 */}
    <rect x="30" y="700" width="12" height="180" rx="6" fill="#92400e" opacity="0.5"/>
    <rect x="20" y="600" width="8"  height="120" rx="4" fill="#92400e" opacity="0.4" transform="rotate(-15,24,600)"/>
    <circle cx="35"  cy="680" r="45" fill="#fce7f3" opacity="0.7"/>
    <circle cx="15"  cy="700" r="32" fill="#fbcfe8" opacity="0.6"/>
    <circle cx="60"  cy="695" r="35" fill="#fce7f3" opacity="0.6"/>
    <circle cx="35"  cy="650" r="38" fill="#fdf2f8" opacity="0.7"/>

    {/* 벚꽃 나무 오른쪽 */}
    <rect x="438" y="700" width="12" height="180" rx="6" fill="#92400e" opacity="0.5"/>
    <rect x="442" y="600" width="8"  height="120" rx="4" fill="#92400e" opacity="0.4" transform="rotate(15,446,600)"/>
    <circle cx="445" cy="680" r="45" fill="#fce7f3" opacity="0.7"/>
    <circle cx="465" cy="700" r="32" fill="#fbcfe8" opacity="0.6"/>
    <circle cx="420" cy="695" r="35" fill="#fce7f3" opacity="0.6"/>
    <circle cx="445" cy="650" r="38" fill="#fdf2f8" opacity="0.7"/>

    {/* 날리는 벚꽃잎 */}
    {[
      [60,150,12],[140,80,8],[220,200,10],[300,120,9],[380,180,11],
      [100,300,7],[250,350,9],[420,280,8],[50,450,10],[350,400,7],
      [170,500,8],[440,500,11],[120,600,9],[320,550,8],[200,650,10],
      [80,750,7],[400,700,9],[240,800,8],[150,850,10],[360,820,7],
    ].map(([x,y,r],i) => (
      <g key={i} transform={`rotate(${i*37},${x},${y})`}>
        <ellipse cx={x} cy={y} rx={r} ry={r*0.6} fill="#fda4af" opacity={0.4+Math.random()*0.3}/>
      </g>
    ))}

    {/* 학교 건물 실루엣 */}
    <rect x="140" y="480" width="200" height="160" rx="4" fill="#f9a8d4" opacity="0.25"/>
    <rect x="160" y="460" width="160" height="30"  rx="2" fill="#f9a8d4" opacity="0.2"/>
    {[160,200,240,280].map((x,i) => (
      <rect key={i} x={x} y={500} width="25" height="35" rx="2" fill="#fbcfe8" opacity="0.4"/>
    ))}
    <rect x="210" y="590" width="60" height="50" rx="2" fill="#fce7f3" opacity="0.5"/>

    {/* 꽃밭 */}
    {[[50,880],[100,875],[160,882],[220,878],[280,880],[340,875],[400,882],[450,878]].map(([x,y],i) => (
      <g key={i}>
        <circle cx={x}   cy={y}   r={7}  fill="#fda4af" opacity="0.6"/>
        <circle cx={x-6} cy={y-5} r={5}  fill="#fda4af" opacity="0.5"/>
        <circle cx={x+6} cy={y-5} r={5}  fill="#fda4af" opacity="0.5"/>
        <circle cx={x}   cy={y-8} r={5}  fill="#fda4af" opacity="0.5"/>
        <circle cx={x}   cy={y}   r={3}  fill="#fef08a" opacity="0.9"/>
      </g>
    ))}

    {/* 풀 */}
    {[[40,898],[90,895],[150,900],[210,896],[270,898],[330,895],[390,900],[445,896]].map(([x,y],i) => (
      <g key={i}>
        <line x1={x}   y1={y} x2={x-5} y2={y-14} stroke="#86efac" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1={x}   y1={y} x2={x}   y2={y-16} stroke="#86efac" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1={x}   y1={y} x2={x+5} y2={y-14} stroke="#86efac" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </g>
    ))}

    {/* 반짝이 */}
    {[[180,40],[260,90],[320,50],[150,130],[400,70]].map(([x,y],i) => (
      <g key={i} opacity="0.5">
        <line x1={x} y1={y-6} x2={x} y2={y+6} stroke="#f9a8d4" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1={x-6} y1={y} x2={x+6} y2={y} stroke="#f9a8d4" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    ))}
  </svg>
);

// ─────────────────────────────────────────
// ✅ 학교 로고 SVG (외부 이미지 대체)
// ─────────────────────────────────────────
const SchoolLogo = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"
    style={{ borderRadius:"50%", border:"2px solid rgba(255,255,255,0.7)", flexShrink:0 }}>
    {/* 꽃잎 배경 */}
    <circle cx="50" cy="50" r="48" fill="#0d9488"/>
    {[0,60,120,180,240,300].map((deg,i) => (
      <ellipse key={i} cx={50+28*Math.cos((deg-90)*Math.PI/180)} cy={50+28*Math.sin((deg-90)*Math.PI/180)}
        rx="18" ry="14" fill="#0d9488" stroke="#fff" strokeWidth="1.5"
        transform={`rotate(${deg},${50+28*Math.cos((deg-90)*Math.PI/180)},${50+28*Math.sin((deg-90)*Math.PI/180)})`}/>
    ))}
    {/* 중앙 빨간 원 */}
    <circle cx="50" cy="50" r="28" fill="#dc2626"/>
    {/* 은평 텍스트 */}
    <text x="50" y="46" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="serif">은평</text>
    <text x="50" y="62" textAnchor="middle" fill="white" fontSize="9"  fontFamily="serif">초등학교</text>
  </svg>
);

// ─────────────────────────────────────────
// ✅ 메인 컴포넌트
// ─────────────────────────────────────────
export default function WeClassAI() {
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState("");
  const [grade,           setGrade]           = useState("1학년");
  const [logs,            setLogs]            = useState([]);
  const [view,            setView]            = useState("chat");
  const [showAdminModal,  setShowAdminModal]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [step,            setStep]            = useState("idle");
  const [studentName,     setStudentName]     = useState("");
  const [studentGender,   setStudentGender]   = useState("");
  const [turnCount,       setTurnCount]       = useState(0);
  const [history,         setHistory]         = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const addBot = (text, isAlert=false) => {
    setMessages((prev) => [...prev, { user:null, bot:text, isAlert }]);
  };

  const parseName = (text) => {
    const cleaned = text.trim()
      .replace(/[이에요입니다요~!♡]$/g,"")
      .replace(/^(저는|나는|제|난|저)\s*/,"")
      .trim();
    return cleaned.length >= 1 && cleaned.length <= 8 ? cleaned : text.trim().slice(0,6);
  };

  const callAI = async (userText, name, gender, grade_, turn, hist) => {
    const systemPrompt = buildSystemPrompt(name, gender, grade_, turn);
    try {
      const res  = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          messages:[
            { role:"system", content:systemPrompt },
            ...hist,
            { role:"user", content:userText },
          ],
        }),
      });
      const data = await res.json();
      return res.ok
        ? (data.choices?.[0]?.message?.content || getFallback(name, turn))
        : getFallback(name, turn);
    } catch {
      return getFallback(name, turn);
    }
  };

  const getFallback = (name, turn) => {
    const n = name || "친구";
    if (turn <= 3) return `${n}아, 그랬구나. 많이 힘들었겠다 💕\n조금 더 이야기해줄 수 있어?`;
    if (turn <= 6) return `${n}아, 어떤 상황이었는지 좀 더 말해줘.\n선생님이 잘 들을게 😊`;
    if (turn <= 9) return `${n}아, 이런 방법도 있는데 어떻게 생각해?\n같이 생각해보자 🌸`;
    return `${n}아, 선생님이랑 직접 이야기하면\n훨씬 더 잘 도와줄 수 있을 것 같아.\n위클래스 상담실에 한번 와줄 수 있어? 💙`;
  };

  // ✅ 버튼 클릭 → 즉시 전송 (수정된 핵심 부분)
  const handleCategoryClick = useCallback((value) => {
    if (loading) return;
    const text    = value;
    const score   = getRisk(text);
    const category= getCategory(text);

    setMessages((prev) => [...prev, { user:text, bot:null, isAlert:false }]);
    setLoading(true);

    setTimeout(async () => {
      if (step === "idle") {
        setStep("asked_name");
        const greeting =
          `안녕! 😊 나는 ${SCHOOL_NAME} 위클래스 상담선생님 ${COUNSELOR_NAME}이야.\n\n` +
          `이곳은 네 이야기를 편하게 나눌 수 있는 안전한 공간이에요 💕\n\n` +
          `먼저 어떻게 불러드릴까요?\n실명도 괜찮고, 편한 별명도 좋아요 🌸`;
        setMessages((prev) => prev.map((m,i) => i===prev.length-1 ? {...m,bot:greeting} : m));
      }
      setLoading(false);
    }, 900);
  }, [loading, step]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { user:text, bot:null, isAlert:false }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r,900));

    // STEP 1: 첫 메시지 → 이름 질문
    if (step === "idle") {
      setStep("asked_name");
      const greeting =
        `안녕! 😊 나는 ${SCHOOL_NAME} 위클래스 상담선생님 ${COUNSELOR_NAME}이야.\n\n` +
        `이곳은 네 이야기를 편하게 나눌 수 있는 안전한 공간이에요 💕\n\n` +
        `먼저 어떻게 불러드릴까요?\n실명도 괜찮고, 편한 별명도 좋아요 🌸`;
      setMessages((prev) => prev.map((m,i) => i===prev.length-1 ? {...m,bot:greeting} : m));
      setLoading(false);
      return;
    }

    // STEP 2: 이름 받음 → 성별 질문
    if (step === "asked_name") {
      const name = parseName(text);
      setStudentName(name);
      setStep("asked_gender");
      const reply = `${name}아, 반가워요! 😊\n선생님이 더 잘 도와드릴 수 있도록\n한 가지만 더 물어봐도 될까요?`;
      setMessages((prev) => prev.map((m,i) => i===prev.length-1 ? {...m,bot:reply} : m));
      setLoading(false);
      return;
    }

    // STEP 4: 본격 상담
    if (step === "counseling") {
      const score    = getRisk(text);
      const category = getCategory(text);
      const newTurn  = turnCount + 1;
      setTurnCount(newTurn);

      let reply   = "";
      let isAlert = false;

      if (score >= 3) {
        reply   = getCrisisReply(studentName, studentGender);
        isAlert = true;
      } else {
        const newHistory = [...history, { role:"user", content:text }];
        reply = await callAI(text, studentName, studentGender, grade, newTurn, history);
        setHistory([...newHistory, { role:"assistant", content:reply }]);
      }

      setMessages((prev) => prev.map((m,i) => i===prev.length-1 ? {...m,bot:reply,isAlert} : m));
      setLogs((prev) => [...prev, {
        grade, gender:studentGender, category, risk:score,
        question:text, answer:reply,
        studentName, time:new Date().toLocaleString("ko-KR"),
      }]);
    }
    setLoading(false);
  }, [input, loading, step, studentName, studentGender, grade, turnCount, history]);

  const handleGender = (gender) => {
    setStudentGender(gender);
    setStep("counseling");
    const genderEmoji = gender==="여학생" ? "👧" : gender==="남학생" ? "👦" : "🌟";
    const reply =
      `${genderEmoji} 알겠어요!\n\n` +
      `${studentName}아, 이제 편하게 이야기해줘요 💕\n` +
      `어떤 이야기든 선생님이 잘 들을게요.\n` +
      `오늘 어떤 마음으로 왔어요?`;
    addBot(reply);
  };

  const handleKeyDown = (e) => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (view==="admin") return <AdminDashboard logs={logs} onBack={() => setView("chat")} />;

  return (
    <div style={{ maxWidth:480,margin:"0 auto",height:"100dvh",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",position:"relative",overflow:"hidden" }}>

      {/* ✅ 분홍 배경 SVG */}
      <PinkBackground />

      <div style={{ position:"relative",zIndex:2,display:"flex",flexDirection:"column",height:"100%" }}>

        {/* 헤더 */}
        <div style={{ background:"linear-gradient(135deg,rgba(236,72,153,0.95),rgba(219,39,119,0.95))",color:"#fff",padding:"12px 16px",boxShadow:"0 2px 14px rgba(236,72,153,0.4)",flexShrink:0 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              {/* ✅ SVG 로고 */}
              <SchoolLogo size={40} />
              <div>
                <div style={{ fontWeight:"bold",fontSize:15 }}>{SCHOOL_NAME} 위클래스</div>
                <div style={{ fontSize:11,opacity:0.9,marginTop:1 }}>
                  상담교사 {COUNSELOR_NAME} 선생님 💕
                  {studentName && ` · ${studentName}`}
                </div>
              </div>
            </div>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <select value={grade} onChange={(e)=>setGrade(e.target.value)}
                style={{ padding:"5px 6px",borderRadius:8,border:"none",background:"rgba(255,255,255,0.22)",color:"#fff",fontSize:12,cursor:"pointer" }}>
                {GRADES.map((g)=><option key={g} style={{ color:"#000" }}>{g}</option>)}
              </select>
              <button onClick={()=>setShowAdminModal(true)}
                style={{ padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.45)",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",fontSize:11 }}>
                🔒 관리자
              </button>
            </div>
          </div>
        </div>

        {/* 채팅 영역 */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 12px" }}>

          {/* 첫 화면 */}
          {messages.length===0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ background:"rgba(255,255,255,0.88)",borderRadius:24,padding:"20px 18px",margin:"0 4px",boxShadow:"0 6px 28px rgba(236,72,153,0.15)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.7)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                  <SchoolLogo size={52} />
                  <div>
                    <div style={{ fontSize:16,fontWeight:"bold",color:"#db2777" }}>{SCHOOL_NAME}</div>
                    <div style={{ fontSize:13,color:"#9d174d",marginTop:2 }}>위클래스 AI 상담실 🌸</div>
                  </div>
                </div>
                <div style={{ fontSize:14,lineHeight:1.9,color:"#374151",marginBottom:12 }}>
                  안녕하세요! 👋<br/>
                  <b style={{ color:"#db2777" }}>{COUNSELOR_NAME} 선생님</b>이 여러분의 이야기를<br/>
                  언제든 들어드릴 준비가 되어 있어요 💕<br/>
                  <span style={{ fontSize:12,color:"#9ca3af" }}>어떤 이야기든 비밀이 보장돼요</span>
                </div>
                <div style={{ background:"#fdf2f8",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#9d174d",marginBottom:16,border:"1px solid #fce7f3" }}>
                  👩‍🏫 AI가 먼저 이야기를 들어드려요.<br/>
                  <span style={{ color:"#be185d" }}>필요하면 {COUNSELOR_NAME} 선생님께 직접 연결해드릴게요</span>
                </div>

                {/* ✅ 20가지 상담 버튼 */}
                <div style={{ fontSize:12,fontWeight:"bold",color:"#6b7280",marginBottom:10 }}>
                  💬 어떤 이야기를 하고 싶어요?
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id}
                      onClick={() => handleCategoryClick(cat.value)}
                      style={{ padding:"10px 12px",borderRadius:14,border:"1px solid #fce7f3",background:"rgba(255,255,255,0.9)",color:"#db2777",cursor:"pointer",fontSize:12,textAlign:"left",boxShadow:"0 1px 6px rgba(236,72,153,0.1)",fontFamily:"inherit",lineHeight:1.4,transition:"all 0.15s" }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ margin:"10px 4px 0",background:"rgba(255,255,255,0.7)",borderRadius:12,padding:"9px 14px",fontSize:11,color:"#6b7280",textAlign:"center" }}>
                위급 상황 시 즉시 <b style={{ color:"#dc2626" }}>1393</b> · <b>1388</b> · <b>112</b>
              </div>
            </div>
          )}

          {/* 메시지 목록 */}
          {messages.map((m,i) => (
            <div key={i} style={{ marginBottom:14 }}>
              {m.user && (
                <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:6 }}>
                  <div style={{ background:"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",padding:"10px 15px",borderRadius:"18px 18px 4px 18px",maxWidth:"75%",fontSize:14,lineHeight:1.55,wordBreak:"break-word",boxShadow:"0 2px 10px rgba(236,72,153,0.3)" }}>
                    {m.user}
                  </div>
                </div>
              )}
              {m.bot===null && (
                <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 2px" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#ec4899,#db2777)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>👩‍🏫</div>
                  <div style={{ background:"rgba(255,255,255,0.9)",borderRadius:14,padding:"8px 14px",display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ fontSize:12,color:"#9ca3af" }}>{COUNSELOR_NAME} 선생님이 답변 중</span>
                    {[0,1,2].map((d)=>(
                      <div key={d} style={{ width:6,height:6,borderRadius:"50%",background:"#f9a8d4",animation:`bounce 1s ${d*0.2}s infinite ease-in-out` }}/>
                    ))}
                  </div>
                </div>
              )}
              {m.bot && (
                <div style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:m.isAlert?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#ec4899,#db2777)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,marginTop:2 }}>
                    {m.isAlert?"⚠️":"👩‍🏫"}
                  </div>
                  <div style={{ background:m.isAlert?"rgba(254,242,242,0.95)":"rgba(255,255,255,0.92)",border:`1px solid ${m.isAlert?"#fecaca":"#fce7f3"}`,padding:"11px 14px",borderRadius:"4px 18px 18px 18px",maxWidth:"80%",fontSize:13.5,color:m.isAlert?"#991b1b":"#1f2937",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word",boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}>
                    {m.bot}
                  </div>
                </div>
              )}
              {/* 성별 선택 카드 */}
              {step==="asked_gender" && i===messages.length-1 && m.bot && (
                <div style={{ marginTop:12 }}>
                  <GenderSelect name={studentName} onSelect={handleGender} />
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        {/* 입력창 */}
        <div style={{ padding:"10px 12px 14px",background:"rgba(255,255,255,0.92)",borderTop:"1px solid #fce7f3",boxShadow:"0 -2px 14px rgba(236,72,153,0.1)",flexShrink:0 }}>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <input
              style={{ flex:1,padding:"12px 16px",border:"1px solid #fce7f3",borderRadius:24,fontSize:14,outline:"none",background:loading?"#fdf2f8":"#fff",fontFamily:"inherit" }}
              value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={
                loading            ? `${COUNSELOR_NAME} 선생님이 답변 중...` :
                step==="idle"      ? "버튼을 누르거나 직접 입력해요 💕" :
                step==="asked_name"? "이름 또는 별명을 입력해줘요 🌸" :
                step==="asked_gender"? "위 버튼을 눌러주세요 👆" :
                `${studentName}아, 편하게 이야기해줘요 😊`
              }
              disabled={loading || step==="asked_gender"}
            />
            <button onClick={sendMessage}
              disabled={loading||!input.trim()||step==="asked_gender"}
              style={{ width:46,height:46,borderRadius:"50%",border:"none",background:loading||!input.trim()||step==="asked_gender"?"#e5e7eb":"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",cursor:loading||!input.trim()||step==="asked_gender"?"not-allowed":"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s",boxShadow:loading||!input.trim()?"none":"0 2px 10px rgba(236,72,153,0.4)" }}>
              ➤
            </button>
          </div>
          <div style={{ textAlign:"center",fontSize:10,color:"#f9a8d4",marginTop:8 }}>
            위급상황 ☎ 1393 자살예방 · ☎ 1388 청소년상담 · ☎ 112 긴급
          </div>
        </div>
      </div>

      {showAdminModal && (
        <AdminModal
          onSuccess={()=>{ setShowAdminModal(false); setView("admin"); }}
          onClose={()=>setShowAdminModal(false)}
        />
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.6} 50%{transform:translateY(-5px);opacity:1} }
        input:focus { border-color:#ec4899!important; box-shadow:0 0 0 3px rgba(236,72,153,0.15)!important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#fce7f3; border-radius:4px; }
        button:active { transform:scale(0.96); }
      `}</style>
    </div>
  );
}