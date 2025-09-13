import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setMessages(msgs => [...msgs, { role: 'user', content: input }]);
    try {
      //휴대폰 컴퓨터 같은 ip 주소
  const response = await fetch('http://192.168.212.48:5001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, user: 'user1' })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const aiMsg = await response.text();
      setMessages(msgs => [...msgs, { role: 'assistant', content: aiMsg }]);
      setInput('');
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>AI Chat</Text>
      <View style={styles.chatBox}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 20 }}>
          {messages.map((msg, i) => (
            <View key={i} style={[styles.messageRow, msg.role === 'user' ? styles.userRow : styles.aiRow]}>
              <View style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={{ color: msg.role === 'user' ? 'white' : 'black' }}>{msg.content}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <Text style={styles.loading}>AI is typing...</Text>
          )}
        </ScrollView>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          style={styles.input}
          placeholder="Type your message..."
          editable={!loading}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || !input.trim()}
          style={[styles.button, loading || !input.trim() ? styles.buttonDisabled : null]}
        >
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingTop: 60,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  chatBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  messageRow: {
    marginVertical: 5,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 15,
  },
  userBubble: {
    backgroundColor: '#007bff',
  },
  aiBubble: {
    backgroundColor: '#e9ecef',
  },
  loading: {
    color: '#666',
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
