
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, Button, TextInput, Alert, ScrollView, Pressable, ActivityIndicator } from 'react-native';
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
    console.log('Fetching record for date:', day.dateString);
    const { data, error } = await supabase
      .from('records')
      .select('fatigue, notes')
      .eq('user_id', user_id)
      .eq('date', day.dateString)
      .maybeSingle(); // single() 대신 maybeSingle() 사용
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
    console.log('Saving record:', { user_id, date: selectedDate, fatigue, notes: note });
    const { error } = await supabase
      .from('records')
      .upsert(
        { 
          user_id, 
          date: selectedDate, 
          fatigue: parseInt(fatigue), // fatigue를 정수로 변환
          notes: note || null // 빈 문자열 대신 null 사용
        },
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
      // backendUrl이 설정되어 있는지 확인
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      console.log('Backend URL:', backendUrl);
      
      if (!backendUrl) {
        throw new Error('Backend URL이 설정되지 않았습니다');
      }

      const requestBody = {
        from: selectedDateRange.from,
        to: selectedDateRange.to,
      };
      
      console.log('Sending request:', {
        url: `${backendUrl}/analyze`,
        method: 'POST',
        body: requestBody
      });
      
      const response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Server response:', data);
      
      if (!response.ok) {
        throw new Error(
          typeof data.error === 'string' 
            ? data.error 
            : data.message || '분석 중 오류가 발생했습니다'
        );
      }

      if (!data.result) {
        throw new Error('서버 응답에 분석 결과가 없습니다');
      }

      setAnalysisResult(data.result);
      setShowAnalysis(true);
    } catch (error) {
      console.error('Analysis error:', error);
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
        <Pressable
          style={({ pressed }) => [
            styles.analyzeButton,
            { opacity: pressed ? 0.8 : 1 },
            (!selectedDateRange.from || !selectedDateRange.to || analysisLoading) && styles.analyzeButtonDisabled
          ]}
          onPress={handleAnalyze}
          disabled={!selectedDateRange.from || !selectedDateRange.to || analysisLoading}
        >
          <Text style={styles.analyzeButtonText}>분석하기</Text>
        </Pressable>
      </View>

      {/* Record Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <Text style={styles.modalTitle} role="heading" nativeID="modal-title">{selectedDate} 피곤함 기록</Text>
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
              accessible={true}
              accessibilityLabel={`피곤함 정도 슬라이더: ${fatigue}`}
              accessibilityRole="adjustable"
              accessibilityValue={{ min: 1, max: 10, now: fatigue }}
            />
            <TextInput
              style={styles.input}
              placeholder="메모를 입력하세요"
              value={note}
              onChangeText={setNote}
              accessible={true}
              accessibilityLabel="메모 입력"
              accessibilityHint="피곤함에 대한 메모를 입력하세요"
            />
            <Button title="저장" onPress={handleSave} disabled={loading} accessibilityLabel="저장하기" />
            <Button title="닫기" onPress={() => setModalVisible(false)} accessibilityLabel="모달 닫기" />
          </View>
        </View>
      </Modal>

      {/* Analysis Modal */}
      <Modal visible={showAnalysis} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="analysis-title">
            <Text style={styles.modalTitle} role="heading" nativeID="analysis-title">분석 결과</Text>
            <ScrollView 
              style={styles.analysisScroll}
              accessible={true}
              accessibilityLabel="분석 결과 내용"
            >
              <Text style={styles.analysisText}>{analysisResult}</Text>
            </ScrollView>
            <Button 
              title="닫기" 
              onPress={() => setShowAnalysis(false)} 
              accessibilityLabel="분석 결과 모달 닫기" />
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
    WebkitTextSizeAdjust: '100%',
    MozTextSizeAdjust: '100%',
    textSizeAdjust: '100%',
  },
  analyzeButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 15,
    rowGap: 10, // gap 대신 rowGap 사용
  },
  dateRangeText: {
    textAlign: 'center',
    marginVertical: 10,
    WebkitUserSelect: 'none',
    userSelect: 'none',
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
    minHeight: 200, // auto 대신 실제 값 사용
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    WebkitUserSelect: 'text',
    userSelect: 'text',
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
    height: 300, // maxHeight 대신 height 사용
    width: '100%',
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
