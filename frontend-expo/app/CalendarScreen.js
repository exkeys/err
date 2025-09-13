
import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text, Button, TextInput, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Slider from '@react-native-community/slider';
import { supabase } from '../utils/supabaseClient';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fatigue, setFatigue] = useState(5);
  const [note, setNote] = useState('');
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);

  const handleDayPress = async (day) => {
    setSelectedDate(day.dateString);
    const user_id = 'test_user';
    const { data, error } = await supabase
      .from('records')
      .select('fatigue, notes')
      .eq('user_id', user_id)
      .eq('date', day.dateString)
      .single();
    if (!error && data) {
      setFatigue(data.fatigue);
      setNote(data.notes || '');
    } else {
      setFatigue(5);
      setNote('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    setLoading(true);
    const user_id = 'test_user';
    const { error } = await supabase
      .from('records')
      .upsert(
        { user_id, date: selectedDate, fatigue, notes: note },
        { onConflict: ['user_id', 'date'] }
      );
    setLoading(false);
    if (error) {
      Alert.alert('저장 실패', error.message);
    } else {
      setRecords({
        ...records,
        [selectedDate]: { fatigue, note },
      });
      setModalVisible(false);
    }
  }


  return (
    <View style={styles.container}>
      <Calendar onDayPress={handleDayPress} markedDates={Object.fromEntries(
        Object.entries(records).map(([date, rec]) => [date, { marked: true }])
      )} />
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDate} 피곤함 기록</Text>
            <Text>피곤함 정도: {fatigue}</Text>
            <Slider
              style={{ width: 200, height: 40 }}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={fatigue}
              onValueChange={setFatigue}
              minimumTrackTintColor="#1EB1FC"
              maximumTrackTintColor="#1EB1FC"
            />
            <TextInput
              style={styles.input}
              placeholder="메모를 입력하세요"
              value={note}
              onChangeText={setNote}
            />
            <Button title="저장" onPress={handleSave} disabled={loading} />
            <Button title="닫기" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: '100%',
    marginBottom: 10,
  },
});
// ...existing code...
