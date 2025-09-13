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

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const scrollViewRef = useRef();

  // 앱 초기화
  useEffect(() => {
    async function initializeApp() {
      try {
        await apiClient.initialize();
        setIsReady(true);
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

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !isReady) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const aiMsg = await apiClient.sendChatMessage(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: aiMsg }]);
    } catch (error) {
      console.error("Chat Error:", error);
      
      // 연결 오류인 경우 재연결 시도
      if (error.message.includes('네트워크') || error.message.includes('서버')) {
        setError(error.message);
        Alert.alert(
          '연결 오류',
          error.message,
          [{ 
            text: '다시 시도', 
            onPress: async () => {
              try {
                await apiClient.initialize();
                setError(null);
                // 메시지 재전송
                const retryMsg = await apiClient.sendChatMessage(userMessage);
                setMessages(prev => [...prev, { role: "assistant", content: retryMsg }]);
              } catch (retryError) {
                setMessages(prev => [...prev,
                  { role: "assistant", content: "죄송합니다. 서버에 연결할 수 없습니다." }
                ]);
              }
            }
          }]
        );
      } else {
        setMessages(prev => [...prev,
          { role: "assistant", content: "죄송합니다. 오류가 발생했습니다." }
        ]);
      }
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
                msg.role === "user" ? styles.userBubble : styles.aiBubble
              ]}>
                <Text style={{ color: msg.role === "user" ? "white" : "black" }}>
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

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          editable={!loading}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || !input.trim()}
          style={[styles.button, (loading || !input.trim()) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>전송</Text>
        </TouchableOpacity>
      </View>
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
    maxWidth: "70%",
    padding: 10,
    borderRadius: 15
  },
  userBubble: {
    backgroundColor: "#007bff"
  },
  aiBubble: {
    backgroundColor: "#e9ecef"
  },
  loading: {
    color: "#666",
    marginTop: 10
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
