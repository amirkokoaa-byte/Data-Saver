import React, { useState } from 'react';

interface VideoQuality {
  quality: string;
  sizeMB: number;
  url: string;
}

interface VideoData {
  title: string;
  duration: number;
  thumbnail: string;
  qualities: VideoQuality[];
}

export function VideoInput({ onPlay }: { onPlay?: (url: string, quality: string) => void }) {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVideoDetails = async () => {
    if (!url) return;
    
    setLoading(true);
    setError('');
    setVideoData(null);

    try {
      const response = await fetch('/api/video-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل الاتصال بالخادم');
      }

      setVideoData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800" dir="rtl">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">مُحلل الفيديو (حجم البيانات)</h2>
      
      {/* حقل الإدخال */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="ضع رابط فيديو يوتيوب هنا..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 p-3 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-neutral-950 text-right dark:text-gray-200"
          dir="ltr"
        />
        <button
          onClick={fetchVideoDetails}
          disabled={loading || !url}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-semibold"
        >
          {loading ? 'جاري الفحص...' : 'تحليل الرابط'}
        </button>
      </div>

      {/* رسالة الخطأ */}
      {error && <p className="text-red-500 mt-4 text-center font-medium">{error}</p>}

      {/* عرض نتائج الفيديو */}
      {videoData && (
        <div className="mt-8 border-t dark:border-neutral-800 pt-6 text-right">
          <div className="flex gap-4 items-start mb-6">
            <img src={videoData.thumbnail} alt="صورة الفيديو" className="w-32 rounded-lg shadow-sm" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{videoData.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                المدة: {Math.floor(videoData.duration / 60)} دقيقة و {videoData.duration % 60} ثانية
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">الجودات المتاحة وحجم الاستهلاك المتوقع (اضغط للتشغيل):</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {videoData.qualities.map((q, index) => (
              <div 
                key={index} 
                onClick={() => onPlay && onPlay(url, q.quality)}
                className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-3 rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer hover:border-blue-500 dark:hover:border-blue-500"
              >
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400" dir="ltr">{q.quality}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{q.sizeMB} MB</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
