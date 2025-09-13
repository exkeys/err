import { useState, useEffect } from "react";
import dayjs from "dayjs";


// 1️⃣ 7주간 데이터 조회
async function getWeeklyData(startDate) {
  // 프론트에서는 DB 직접 조회하지 않고, 백엔드에 분석 요청만 보냄
  return null;
}

// 2️⃣ OpenAI 분석
async function analyzeData(data, range = "7주간") {
  if (!data.length) return "분석할 데이터가 없습니다.";
  // 백엔드 분석 API 호출
  try {
  const res = await fetch("http://192.168.212.48:5001/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, range })
    });
    console.log("백엔드 응답 상태:", res.status);
    let responseText = await res.text();
    console.log("백엔드 응답 원문:", responseText);
    let result;
    try {
      result = JSON.parse(responseText).result;
    } catch (jsonErr) {
      console.error("JSON 파싱 오류:", jsonErr);
      return `분석 결과 파싱 실패: ${responseText}`;
    }
    if (!res.ok) return `분석 결과를 가져올 수 없습니다.\n${responseText}`;
    console.log("백엔드 분석 결과:", result);
    return result;
  } catch (err) {
    console.error("백엔드 분석 API 오류:", err);
    return `분석 중 오류가 발생했습니다.\n${err}`;
  }
}

// 3️⃣ 챗봇 UI
export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);

  useEffect(() => {
    // 즉시 알림: 11월 1일 데이터가 들어오자마자
  setMessages([{ role: "assistant", content: "11월 1일부터 1주일 데이터를 분석하시겠습니까? (예/아니오)" }]);
    setPendingAnalysis(true);
    console.log("알림: 분석 요청 메시지 추가됨");
  }, []);

  async function handleReply(reply) {
    setMessages((prev) => [...prev, { role: "user", content: reply }]);
    if (reply.toLowerCase() === "예" && pendingAnalysis) {
      setPendingAnalysis(false);
  // 백엔드에 분석 요청만 보냄
  const result = await analyzeData(["dummy"], "11월 1일부터 1주일");
  setMessages((prev) => [...prev, { role: "assistant", content: result }]);
    } else {
      setPendingAnalysis(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "알겠습니다. 필요할 때 말씀해주세요!" }]);
    }
  }

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      {messages.map((m, i) => (
        <div key={i} style={{ color: m.role === "assistant" ? "#2563eb" : "#333", marginBottom: 8 }}>
          {m.content}
        </div>
      ))}
      {pendingAnalysis && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => handleReply("예")}
            style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: 4 }}
          >
            예
          </button>
          <button
            onClick={() => handleReply("아니오")}
            style={{ padding: "8px 16px", background: "#a3a3a3", color: "#fff", borderRadius: 4 }}
          >
            아니오
          </button>
        </div>
      )}
    </div>
  );
}
