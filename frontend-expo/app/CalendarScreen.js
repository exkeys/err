import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, Button, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Slider from '@react-native-community/slider';
import { supabase } from '../utils/supabaseClient';
import { checkWeeklyDataCompletion } from '../utils/weeklyDataChecker';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';

dayjs.extend(weekday);

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fatigue, setFatigue] = useState(5);
  const [note, setNote] = useState('');
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [weeklyStatus, setWeeklyStatus] = useState(null);

  // 컴포넌트 마운트 시 주간 상태 체크
  useEffect(() => {
    checkCurrentWeekStatus();
  }, []);

  // 주간 상태 체크
  async function checkCurrentWeekStatus() {
    try {
      const result = await checkWeeklyDataCompletion();
      setWeeklyStatus(result);
    } catch (error) {
      console.error('주간 상태 체크 오류:', error);
    }
  }

  // 저장된 데이터가 변경될 때마다 주간 데이터 체크
  useEffect(() => {
    if (selectedDate) {
      console.log('Checking weekly data for date:', selectedDate);
      const dateObj = dayjs(selectedDate);
      const weekStart = dateObj.weekday(1); // 1은 월요일
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        weekDates.push(weekStart.add(i, 'day').format('YYYY-MM-DD'));
      }
      console.log('Week dates (월~일):', weekDates);

      // supabase에서 해당 주의 모든 날짜 기록 fetch
      const checkWeekRecords = async () => {
        console.log('Fetching records for week...');
        const { data: weekRecords, error: weekError } = await supabase
          .from('records')
          .select('date, fatigue, notes')
          .eq('user_id', 'test_user')
          .in('date', weekDates);
        
        if (weekError) {
          console.error('Error fetching week records:', weekError);
          return;
        }

        console.log('Found records for dates:', weekRecords?.map(r => r.date));
        console.log('Total records found:', weekRecords?.length);
        
        if (weekRecords && weekRecords.length === 7) {
          console.log('Complete week found! Suggesting analysis for:', {
            from: weekDates[0],
            to: weekDates[6],
            records: weekRecords
          });
          suggestAnalysis({ from: weekDates[0], to: weekDates[6] });
        } else {
          console.log('Week not complete yet. Need more records.');
        }
      };
      
      checkWeekRecords();
    }
  }, [records, selectedDate]);

  const handleDayPress = async (day) => {
    // 날짜 범위 및 분석 관련 로직 제거

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
          fatigue: parseInt(fatigue),
          notes: note || null
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
      
      // 저장 후 주간 상태 다시 체크
      await checkCurrentWeekStatus();
      
      // 주간 데이터가 완성되었는지 확인하고 알림
      const updatedStatus = await checkWeeklyDataCompletion();
      if (updatedStatus.isComplete && !weeklyStatus?.isComplete) {
        Alert.alert(
          '주간 기록 완성! 🎉',
          '이번 주 7일간의 기록이 모두 완성되었습니다!\n챗봇 탭에서 주간 분석을 확인해보세요.',
          [{ text: '확인', style: 'default' }]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* 주간 상태 표시 */}
      {weeklyStatus && (
        <View style={styles.weeklyStatusContainer}>
          <Text style={styles.weeklyStatusText}>
            이번 주 기록: {weeklyStatus.recordedDays}/7일
            {weeklyStatus.isComplete && " ✅ 완성!"}
          </Text>
          {weeklyStatus.isComplete && (
            <Text style={styles.weeklyCompleteText}>
              챗봇 탭에서 주간 분석을 받아보세요! 🤖
            </Text>
          )}
        </View>
      )}

      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          ...Object.fromEntries(
            Object.entries(records).map(([date, rec]) => [date, { marked: true }])
          )
        }}
      />

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

  {/* 분석 결과 모달 및 버튼 완전 제거됨 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40
  },
  weeklyStatusContainer: {
    padding: 10,
    backgroundColor: '#f0f9ff',
    marginBottom: 10,
    borderRadius: 8,
    marginHorizontal: 10
  },
  weeklyStatusText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#0369a1'
  },
  weeklyCompleteText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#059669',
    marginTop: 5
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: 300,
    minHeight: 200
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: '100%',
    marginBottom: 10
  }
});