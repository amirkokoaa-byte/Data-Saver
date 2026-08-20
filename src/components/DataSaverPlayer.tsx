import React, { useState, useEffect, useRef } from 'react';
import { useDataTracker } from '../hooks/useDataTracker';

interface DataSaverPlayerProps {
  videoId: string;
}

export function DataSaverPlayer({ videoId }: DataSaverPlayerProps) {
  const { todayUsage: usedMB, addUsage: addDataUsage } = useDataTracker();
  const [isPlaying, setIsPlaying] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // معدلات استهلاك تقريبية (بالميجابايت في الثانية)
  // 144p = تقريباً 1.5 ميجا في الدقيقة = 0.025 ميجا في الثانية
  const MB_PER_SECOND_144P = 0.025; 
  // 720p = تقريباً 15 ميجا في الدقيقة = 0.25 ميجا في الثانية
  const MB_PER_SECOND_NORMAL = 0.25;

  // تشغيل العداد عند المشاهدة وإيقافه عند الإيقاف
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const consumption = dataSaverMode ? MB_PER_SECOND_144P : MB_PER_SECOND_NORMAL;
        addDataUsage(consumption);
      }, 1000); // يتم إضافة الاستهلاك كل ثانية
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, dataSaverMode, addDataUsage]);

  // محاكاة أحداث التشغيل والإيقاف (في التطبيق الحقيقي يفضل استخدام YouTube Iframe API)
  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="w-full mt-4 p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-100 dark:border-neutral-800" dir="rtl">
      
      {/* لوحة تحكم الاستهلاك */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 gap-4">
        <div className="text-center sm:text-right">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">استهلاك اليوم</h3>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400" dir="ltr">
            {usedMB.toFixed(2)} <span className="text-sm text-gray-500 dark:text-gray-400">MB</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">وضع توفير البيانات (144p)</label>
          <div 
            onClick={() => setDataSaverMode(!dataSaverMode)}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${dataSaverMode ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${dataSaverMode ? '-translate-x-6' : 'translate-x-0'}`}></div>
          </div>
        </div>
      </div>

      {/* مشغل الفيديو */}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center group cursor-pointer" onClick={togglePlay}>
        
        {dataSaverMode ? (
          // وضع التوفير: خدعة الـ CSS لإجبار الجودة المنخفضة
          <div className="w-[200px] h-[200px] transform scale-[4.5] transform-origin-center pointer-events-none opacity-80">
            <iframe
              width="200"
              height="200"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&controls=0&disablekb=1&modestbranding=1`}
              frameBorder="0"
              allow="autoplay"
              className="w-full h-full object-cover"
            ></iframe>
          </div>
        ) : (
          // الوضع العادي
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full pointer-events-none"
          ></iframe>
        )}

        {/* طبقة التحكم الوهمية (Overlay) */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity hover:bg-opacity-50">
            <button className="bg-red-600 text-white rounded-full p-4 hover:bg-red-700 transition transform hover:scale-110 shadow-lg">
              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4 font-medium">
        * يتم تصفير العداد تلقائياً عند منتصف الليل. لا يتم حفظ أي بيانات على خوادم خارجية.
      </p>
    </div>
  );
}
