import Constants from 'expo-constants';

class ApiClient {
  constructor() {
    this.baseUrl = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Constants 설정에서 백엔드 URL 가져오기
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      if (!backendUrl) {
        throw new Error('Backend URL is not configured in app.json');
      }
      this.baseUrl = backendUrl;
      console.log('Using backend URL:', this.baseUrl);

      // 서버 연결 테스트
      try {
        console.log('Connecting to server...');
        const response = await fetch(this.baseUrl);
        
        if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
        
        this.isInitialized = true;
        console.log('Server connection established');
      } catch (error) {
        if (error.message.includes('Network request failed')) {
          throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        }
        throw error;
      }
    } catch (error) {
      console.error('API 클라이언트 초기화 실패:', error);
      throw error;
    }
  }

  async sendChatMessage(message, userId = 'user1') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, user: userId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
  }
}

export const apiClient = new ApiClient();