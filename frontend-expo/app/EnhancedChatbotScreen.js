// app/EnhancedChatbotScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from "react-native";
import { apiClient } from '../utils/api';
import { checkWeeklyDataCompletion, getAnalysisProposalStatus, setAnalysisProposalStatus, getCurrentWeekKey } from '../utils/weeklyDataChecker';
import Constants from 'expo-constants';

export default function EnhancedChatbotScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [pendingWeeklyAnalysis, setPendingWeeklyAnalysis] = useState(false);
  const [weeklyData, setWeeklyData] = useState(null);
  const scrollViewRef = useRef();

  // 앱 초기화 및 주간 데이터 체크
  useEffect(() => {
    async function initializeApp() {
      try {
        await apiClient.initialize();
        setIsReady(true);
        
        // 주간 데이터 완성도 체크
        await checkAndProposeWeeklyAnalysis();
      } catch (error) {
        console.error('App initialization error:', error);
        setError(error.message);
        Alert.alert(
          '연결 오류',
          error.message,
          [{ text: '다시 시도', onPress: initializeApp }]
        );
      }
    }

    initializeApp();
  }, []);

  // 주간 분석 제안 체크
  async function checkAndProposeWeeklyAnalysis() {
    try {
      const weekKey = getCurrentWeekKey();
      const alreadyProposed = getAnalysisProposalStatus(weekKey);
      
      if (alreadyProposed) {
        console.log('이번 주는 이미 분석을 제안했음');
        return;
      }
      
      const result = await checkWeeklyDataCompletion();
      console.log('주간 데이터 체크 결과:', result);
      
      if (result.isComplete) {
        // 7일 데이터가 완성됨 - 분석 제안
        setWeeklyData(result.weekRange);
        setMessages([{
          role: "assistant",
          content: `안녕하세요! 이번 주(${result.weekRange.from} ~ ${result.weekRange.to}) 7일간의 감정 기록이 완성되었네요! 🎉\n\n주간 감정 패턴을 분석해드릴까요?`,
          isWeeklyProposal: true
        }]);
        setPendingWeeklyAnalysis(true);
        
        // 이번 주에 대해 제안했다고 표시
        setAnalysisProposalStatus(weekKey, true);
      } else {
        // 데이터 미완성 - 일반 환영 메시지
        setMessages([{
          role: "assistant",
          content: `안녕하세요! 감정 케어 AI입니다. 😊\n\n현재 이번 주 기록: ${result.recordedDays}/7일\n꾸준히 기록해주시면 주간 분석을 도와드릴게요!`
        }]);
      }
    } catch (error) {
      console.error('주간 분석 체크 오류:', error);
      setMessages([{
        role: "assistant",
        content: "안녕하세요! 감정 케어 AI입니다. 😊\n무엇을 도와드릴까요?"
      }]);
    }
  }

  // 메시지가 추가될 때마다 스크롤을 아래로
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // 주간 분석 실행
  async function performWeeklyAnalysis() {
    if (!weeklyData) return;
    
    setLoading(true);
    try {
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      if (!backendUrl) {
        throw new Error('Backend URL이 설정되지 않았습니다');
      }

      console.log('주간 분석 요청:', weeklyData);
      
      const response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: weeklyData.from,
          to: weeklyData.to,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '분석 중 오류가 발생했습니다');
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📊 이번 주 감정 분석 결과:\n\n${data.result}`,
        isAnalysisResult: true
      }]);
      
    } catch (error) {
      console.error('주간 분석 오류:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      }]);
    }
    
    setPendingWeeklyAnalysis(false);
    setWeeklyData(null);
    setLoading(false);
  }

  // 사용자 응답 처리
  const handleUserResponse = async (response) => {
    if (pendingWeeklyAnalysis) {
      setMessages(prev => [...prev, { role: "user", content: response }]);
      
      if (response.toLowerCase().includes('네') || response.toLowerCase().includes('예') || response.toLowerCase().includes('분석')) {
        await performWeeklyAnalysis();
      } else {
        setPendingWeeklyAnalysis(false);
        setWeeklyData(null);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "알겠습니다! 언제든지 필요하시면 말씀해주세요. 😊"
        }]);
      }
      return;
    }
    
    // 일반 채팅 처리
    await sendMessage(response);
  };

  // 일반 채팅 메시지 전송
  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading || !isReady) return;

    const userMessage = messageText.trim();
    if (!pendingWeeklyAnalysis) {
      setInput("");
      setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    }
    setLoading(true);

    try {
      const aiMsg = await apiClient.sendChatMessage(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: aiMsg }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev,
        { role: "assistant", content: "죄송합니다. 오류가 발생했습니다." }
      ]);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>감정 케어 AI</Text>
      
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={[styles.chatBox, !isReady && styles.chatBoxDisabled]}>
        <ScrollView ref={scrollViewRef}>
          {messages.map((msg, i) => (
            <View key={i} style={[
              styles.messageRow,
              msg.role === "user" ? styles.userRow : styles.aiRow
            ]}>
              <View style={[
                styles.messageBubble,
                msg.role === "user" ? styles.userBubble : styles.aiBubble,
                msg.isWeeklyProposal && styles.proposalBubble,
                msg.isAnalysisResult && styles.analysisBubble
              ]}>
                <Text style={{ 
                  color: msg.role === "user" ? "white" : "black",
                  lineHeight: 20
                }}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <Text style={styles.loading}>AI가 답변을 작성중입니다...</Text>
          )}
        </ScrollView>
      </View>

      {/* 주간 분석 제안 버튼들 */}
      {pendingWeeklyAnalysis && (
        <View style={styles.proposalButtons}>
          <TouchableOpacity
            style={[styles.proposalButton, styles.yesButton]}
            onPress={() => handleUserResponse('네, 분석해주세요!')}
            disabled={loading}
          >
            <Text style={styles.proposalButtonText}>네, 분석해주세요!</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proposalButton, styles.noButton]}
            onPress={() => handleUserResponse('아니요, 괜찮습니다')}
            disabled={loading}
          >
            <Text style={styles.proposalButtonText}>아니요, 괜찮습니다</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 일반 입력창 */}
      {!pendingWeeklyAnalysis && (
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={[styles.button, (loading || !input.trim()) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>전송</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: 60,
    paddingHorizontal: 10
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10
  },
  chatBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 10
  },
  messageRow: {
    marginVertical: 5,
    flexDirection: "row"
  },
  userRow: {
    justifyContent: "flex-end"
  },
  aiRow: {
    justifyContent: "flex-start"
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 15
  },
  userBubble: {
    backgroundColor: "#007bff"
  },
  aiBubble: {
    backgroundColor: "#e9ecef"
  },
  proposalBubble: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3"
  },
  analysisBubble: {
    backgroundColor: "#f3e5f5",
    borderLeftWidth: 4,
    borderLeftColor: "#9c27b0"
  },
  loading: {
    color: "#666",
    marginTop: 10,
    fontStyle: "italic"
  },
  proposalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    gap: 10,
    marginBottom: 10
  },
  proposalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center"
  },
  yesButton: {
    backgroundColor: "#4caf50"
  },
  noButton: {
    backgroundColor: "#757575"
  },
  proposalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
    backgroundColor: "#fff"
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: "#007bff"
  },
  buttonDisabled: {
    backgroundColor: "#ccc"
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold"
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ef9a9a"
  },
  errorText: {
    color: "#c62828",
    textAlign: "center"
  },
  chatBoxDisabled: {
    opacity: 0.7
  }
});