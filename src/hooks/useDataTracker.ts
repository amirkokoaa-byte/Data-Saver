import { useState, useEffect, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';

export interface DailyData {
  date: string;
  mbUsed: number;
}

export function useDataTracker() {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [todayUsage, setTodayUsage] = useState<number>(0);

  useEffect(() => {
    // Load from localStorage
    const savedData = localStorage.getItem('youtube_data_usage');
    if (savedData) {
      try {
        const parsed: DailyData[] = JSON.parse(savedData);
        setDailyData(parsed);
        
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayRecord = parsed.find(d => d.date === todayStr);
        if (todayRecord) {
          setTodayUsage(todayRecord.mbUsed);
        }
      } catch (e) {
        console.error('Failed to parse local storage data');
      }
    }
  }, []);

  const addUsage = useCallback((mb: number) => {
    setTodayUsage(prev => {
      const newUsage = prev + mb;
      
      setDailyData(prevData => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const existingIndex = prevData.findIndex(d => d.date === todayStr);
        
        let newData = [...prevData];
        if (existingIndex >= 0) {
          newData[existingIndex] = { ...newData[existingIndex], mbUsed: newData[existingIndex].mbUsed + mb };
        } else {
          newData.push({ date: todayStr, mbUsed: mb });
        }
        
        localStorage.setItem('youtube_data_usage', JSON.stringify(newData));
        return newData;
      });

      return newUsage;
    });
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('youtube_data_usage');
    setDailyData([]);
    setTodayUsage(0);
  };

  return { dailyData, todayUsage, addUsage, clearHistory };
}
