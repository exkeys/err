
import { useState } from "react";
import { View, Text, Button, TextInput, ScrollView } from "react-native";
import dayjs from "dayjs";

// 분석 결과를 받아오는 API 호출 함수 (날짜 범위)
async function fetchAnalysisByDate(from, to) {
  // 백엔드 /analyze API를 통해 AI 분석 결과 받아오기
  const res = await fetch("http://192.168.212.48:5001/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to })
  });
  if (!res.ok) {
    // 에러 응답은 텍스트로 처리 (HTML 등)
    const errorText = await res.text();
    return "분석 결과를 가져올 수 없습니다.\n" + errorText;
  }
  try {
    const { result } = await res.json();
    return result;
  } catch (e) {
    // JSON 파싱 오류 시 텍스트로 반환
    const errorText = await res.text();
    return "분석 결과를 가져올 수 없습니다.\n" + errorText;
  }
}

// 챗봇 대화 API 호출 함수
async function fetchChatbotMessage(message, user = "test_user") {
  const res = await fetch("http://192.168.212.48:5001/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user })
  });ㅁ
  if (!res.ok) return "챗봇 응답을 가져올 수 없습니다.";
  return await res.text();
}

export default function Chatbot() {
  const [messages, setMessages] = useState([]); // 챗봇 대화 메시지
  const [input, setInput] = useState(""); // 챗봇 입력값
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 챗봇 메시지 전송
  async function handleSend() {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setLoading(true);
    const aiReply = await fetchChatbotMessage(input);
    setMessages(msgs => [...msgs, { role: "assistant", content: aiReply }]);
    setInput("");
    setLoading(false);
  }

  // 분석 버튼 핸들러
  async function handleAnalyze() {
    setAnalysisResult("");
    setAnalyzing(true);
    const result = await fetchAnalysisByDate(fromDate, toDate);
    setAnalysisResult(result);
    setAnalyzing(false);
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* 챗봇 대화 UI */}
      <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12 }}>챗봇 대화</Text>
      {messages.map((m, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={{ color: m.role === "user" ? "black" : "blue" }}>
            {m.role === "user" ? "나: " : "챗봇: "}{m.content}
          </Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <TextInput
          placeholder="메시지를 입력하세요"
          value={input}
          onChangeText={setInput}
          style={{ flex: 1, borderWidth: 1, padding: 8, marginRight: 8 }}
        />
        <Button title="전송" onPress={handleSend} disabled={loading || !input.trim()} />
      </View>

      {/* 분석 기능 UI */}
      <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <Text style={{ fontWeight: "bold", marginBottom: 8 }}>감정 기록 분석</Text>
        <Text style={{ marginBottom: 8 }}>분석할 날짜 범위를 입력하세요 (YYYY-MM-DD)</Text>
        <TextInput
          placeholder="시작 날짜 (예: 2025-09-12)"
          value={fromDate}
          onChangeText={setFromDate}
          style={{ borderWidth: 1, marginBottom: 8, padding: 8 }}
        />
        <TextInput
          placeholder="종료 날짜 (예: 2025-09-20)"
          value={toDate}
          onChangeText={setToDate}
          style={{ borderWidth: 1, marginBottom: 8, padding: 8 }}
        />
        <Button title="분석하기" onPress={handleAnalyze} disabled={analyzing || !fromDate || !toDate} />
        {analyzing && <Text style={{ marginTop: 8 }}>분석 중...</Text>}
        {analysisResult ? (
          <Text style={{ marginTop: 16, color: "blue" }}>{analysisResult}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
