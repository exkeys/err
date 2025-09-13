import { createClient } from '@supabase/supabase-js';

// 환경 변수 또는 직접 입력
const SUPABASE_URL = 'https://xvzgdwbssmuwsycwtlho.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2emdkd2Jzc211d3N5Y3d0bGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDA1NzUsImV4cCI6MjA3Mjk3NjU3NX0.e-Y7v0Z-nMPHGafqDkblOSiYDVljvUfaYojYiLPlBTo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);