
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, Button, TextInput, Alert, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Slider from '@react-native-community/slider';
import { supabase } from '../utils/supabaseClient';
import Constants from 'expo-constants';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fatigue, setFatigue] = useState(5);
  const [note, setNote] = useState('');
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: null,
    to: null,
  });

  const handleDayPress = async (day) => {
    // If we're selecting a date range
    if (selectedDateRange.from && !selectedDateRange.to) {
      // Don't allow selecting a date before the start date
      if (day.dateString < selectedDateRange.from) {
        Alert.alert('날짜 선택 오류', '시작 날짜보다 이전 날짜를 선택할 수 없습니다');
        return;
      }
      setSelectedDateRange({
        ...selectedDateRange,
        to: day.dateString,
      });
      return;
    }

    if (!selectedDateRange.from) {
      setSelectedDateRange({
        from: day.dateString,
        to: null,
      });
      return;
    }

    // Normal day selection for recording
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

  const handleAnalyze = async () => {
    if (!selectedDateRange.from || !selectedDateRange.to) {
      Alert.alert('분석 실패', '날짜 범위를 선택해주세요');
      return;
    }

    setAnalysisLoading(true);
    try {
      const response = await fetch(`${Constants.manifest.extra.backendUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: selectedDateRange.from,
          to: selectedDateRange.to,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '분석 중 오류가 발생했습니다');
      }

      setAnalysisResult(data.result);
      setShowAnalysis(true);
    } catch (error) {
      Alert.alert('분석 실패', error.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markingType={'period'}
        markedDates={{
          ...Object.fromEntries(
            Object.entries(records).map(([date, rec]) => [date, { marked: true }])
          ),
          ...(selectedDateRange.from && {
            [selectedDateRange.from]: {
              startingDay: true,
              color: '#50cebb',
              textColor: 'white',
            },
          }),
          ...(selectedDateRange.to && {
            [selectedDateRange.to]: {
              endingDay: true,
              color: '#50cebb',
              textColor: 'white',
            },
          }),
        }}
      />
      <View style={styles.buttonContainer}>
        <Button
          title="날짜 범위 선택 시작"
          onPress={() => setSelectedDateRange({ from: null, to: null })}
        />
        <Text style={styles.dateRangeText}>
          {selectedDateRange.from ? `${selectedDateRange.from} ~ ${selectedDateRange.to || '선택 중'}` : '날짜 범위를 선택하세요'}
        </Text>
        <Button
          title="분석하기"
          onPress={handleAnalyze}
          disabled={!selectedDateRange.from || !selectedDateRange.to || analysisLoading}
        />
      </View>

      {/* Record Modal */}
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

      {/* Analysis Modal */}
      <Modal visible={showAnalysis} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>분석 결과</Text>
            <ScrollView style={styles.analysisScroll}>
              <Text style={styles.analysisText}>{analysisResult}</Text>
            </ScrollView>
            <Button title="닫기" onPress={() => setShowAnalysis(false)} />
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
  buttonContainer: {
    padding: 15,
    gap: 10,
  },
  dateRangeText: {
    textAlign: 'center',
    marginVertical: 10,
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
    maxHeight: '80%',
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
  analysisScroll: {
    maxHeight: 300,
    width: '100%',
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
