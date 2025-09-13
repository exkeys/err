
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80' }}
        style={styles.banner}
      />
      <Text style={styles.title}>커뮤니티</Text>
      <Text style={styles.subtitle}>함께 소통하고 정보를 나누세요!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingTop: 40,
  },
  banner: {
    width: '90%',
    height: 160,
    borderRadius: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
});
