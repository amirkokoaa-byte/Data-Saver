import React, { useState } from 'react';
import { LoginButton } from './components/LoginButton';
import { VideoInput } from './components/VideoInput';
import { DataSaverPlayer } from './components/DataSaverPlayer';
import { Dashboard } from './components/Dashboard';
import { useDataTracker } from './hooks/useDataTracker';

export default function App() {
  // حالة (State) لحفظ معرف الفيديو الذي يريد المستخدم مشاهدته
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  // لجلب الإحصائيات الخاصة بلوحة التحكم
  const { dailyData, todayUsage } = useDataTracker();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-16 font-sans">
      
      {/* الشريط العلوي (Header) */}
      <header className="bg-white dark:bg-neutral-900 shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-700 dark:text-blue-500">
            يوتيوب <span className="text-green-500">داتا سيفر</span>
          </h1>
          <LoginButton onSuccess={() => {}} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-12">
        
        {/* قسم إدخال الرابط وتحليل الفيديو */}
        <section>
          <VideoInput onPlay={(id) => setActiveVideoId(id)} />
        </section>

        {/* قسم مشغل الفيديو (يظهر فقط إذا اختار المستخدم فيديو) */}
        {activeVideoId && (
          <section className="animate-fade-in-up">
            <DataSaverPlayer videoId={activeVideoId} />
          </section>
        )}

        {/* قسم لوحة التحكم والإحصائيات */}
        <section>
          <Dashboard data={dailyData} todayUsage={todayUsage} />
        </section>

      </div>
    </main>
  );
}

