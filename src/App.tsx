import React, { useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { VideoPlayer } from './components/VideoPlayer';
import { Dashboard } from './components/Dashboard';
import { useDataTracker } from './hooks/useDataTracker';
import { LoginButton } from './components/LoginButton';
import { VideoInput } from './components/VideoInput';
import { PlaySquare, LogOut, Search, Activity, Save, Video } from 'lucide-react';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{name: string, picture: string} | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [dataSaver, setDataSaver] = useState(false);
  const { dailyData, todayUsage, addUsage, clearHistory } = useDataTracker();
  const [playlists, setPlaylists] = useState<any[]>([]);
  
  useEffect(() => {
    // استرجاع بيانات المستخدم من التخزين المحلي كما هو مطلوب
    const name = localStorage.getItem("userName");
    const picture = localStorage.getItem("userPicture");
    if (name && picture) {
      setUserProfile({ name, picture });
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setAccessToken(codeResponse.access_token),
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  });

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    setUserProfile(null);
    localStorage.removeItem("userName");
    localStorage.removeItem("userPicture");
    setPlaylists([]);
  };

  useEffect(() => {
    if (accessToken) {
      fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=5', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(res => res.json())
      .then(data => {
        if (data.items) setPlaylists(data.items);
      })
      .catch(err => console.error("Failed to fetch playlists", err));
    }
  }, [accessToken]);

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return match ? match[1] : null;
  };

  const handleLoadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(videoUrl);
    if (id) {
      setVideoId(id);
    } else {
      alert("Invalid YouTube URL");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner shadow-blue-400/20">
               <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-semibold tracking-tight text-lg">StreamGuard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {userProfile || accessToken ? (
              <div className="flex items-center gap-3">
                {userProfile && (
                  <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
                    <img src={userProfile.picture} alt={userProfile.name} className="w-6 h-6 rounded-full" />
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {userProfile.name}
                    </span>
                  </div>
                )}
                {!userProfile && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-md">
                    Connected
                  </span>
                )}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LoginButton onSuccess={setUserProfile} />
                <button 
                  onClick={() => login()}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
                  title="Connect YouTube (for playlists)"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Player & Controls */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Video Analyzer */}
          <VideoInput 
            onPlay={(url, quality) => {
              const id = extractVideoId(url);
              if (id) {
                setVideoId(id);
                // If they chose a low quality (like 144p or 240p), maybe enable data saver automatically.
                if (quality === '144p' || quality === '240p' || quality === '144p60' || quality === '240p60') {
                  setDataSaver(true);
                } else {
                  setDataSaver(false);
                }
              }
            }} 
          />

          {/* Controls */}
          {videoId && (
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 flex-1">إعدادات المشغل (Player Settings)</h3>
              <button
                onClick={() => setDataSaver(!dataSaver)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dataSaver 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-transparent'
                }`}
              >
                <Save className={`w-4 h-4 ${dataSaver ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                Data Saver (توفير البيانات): {dataSaver ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          {/* Video Player */}
          <VideoPlayer 
            videoId={videoId} 
            dataSaverEnabled={dataSaver} 
            onUsageReport={addUsage} 
            todayUsage={todayUsage}
            usageLimit={500}
          />

        </div>

        {/* Right Column: Dashboard & Playlists */}
        <div className="flex flex-col gap-6 h-full">
          
          <Dashboard data={dailyData} todayUsage={todayUsage} />

          {/* Playlists (OAuth restricted) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <PlaySquare className="w-5 h-5 text-neutral-400" />
              Your Playlists
            </h2>
            
            {!accessToken ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <Video className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-2" />
                <p className="text-sm text-neutral-500">Connect your account to view your YouTube playlists offline.</p>
              </div>
            ) : playlists.length > 0 ? (
              <ul className="space-y-3">
                {playlists.map((playlist) => (
                  <li key={playlist.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer" onClick={() => {
                     // Normally you would fetch playlist items, but for now we just alert
                     alert('Playlist viewing requires additional YouTube Data API integration.');
                  }}>
                    <img 
                      src={playlist.snippet.thumbnails.default.url} 
                      alt={playlist.snippet.title} 
                      className="w-12 h-12 object-cover rounded-md"
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{playlist.snippet.title}</p>
                      <p className="text-xs text-neutral-500">{playlist.snippet.channelTitle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500 text-center py-4">No playlists found.</p>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

