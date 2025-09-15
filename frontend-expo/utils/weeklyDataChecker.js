// utils/weeklyDataChecker.js
import { supabase } from './supabaseClient';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// 주간 데이터 완성도 체크
export async function checkWeeklyDataCompletion(userId = 'test_user') {
  try {
    // 현재 주의 월요일부터 일요일까지 계산
    const now = dayjs();
    const startOfWeek = now.startOf('isoWeek'); // ISO 주 기준 (월요일 시작)
    const endOfWeek = now.endOf('isoWeek');
    
    const fromDate = startOfWeek.format('YYYY-MM-DD');
    const toDate = endOfWeek.format('YYYY-MM-DD');
    
    console.log('주간 데이터 체크:', { fromDate, toDate });
    
    // 해당 주간의 모든 기록 조회
    const { data, error } = await supabase
      .from('records')
      .select('date, fatigue, notes')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('주간 데이터 조회 오류:', error);
      return { isComplete: false, error: error.message };
    }
    
    // 7일 모두 데이터가 있는지 확인
    const recordDates = data.map(record => record.date);
    const expectedDates = [];
    
    for (let i = 0; i < 7; i++) {
      expectedDates.push(startOfWeek.add(i, 'day').format('YYYY-MM-DD'));
    }
    
    const isComplete = expectedDates.every(date => recordDates.includes(date));
    
    return {
      isComplete,
      weekRange: { from: fromDate, to: toDate },
      recordedDays: recordDates.length,
      totalDays: 7,
      data: data
    };
    
  } catch (error) {
    console.error('주간 데이터 체크 오류:', error);
    return { isComplete: false, error: error.message };
  }
}

// 분석 제안 상태 관리 (AsyncStorage 대신 메모리 사용)
let analysisProposalStatus = {};

export function getAnalysisProposalStatus(weekKey) {
  return analysisProposalStatus[weekKey] || false;
}

export function setAnalysisProposalStatus(weekKey, status) {
  analysisProposalStatus[weekKey] = status;
}

export function getCurrentWeekKey() {
  return dayjs().startOf('isoWeek').format('YYYY-MM-DD');
}