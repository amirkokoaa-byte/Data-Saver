import React, { useEffect, useState, useRef, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent, YouTubePlayer } from 'react-youtube';

interface VideoFormat {
  qualityLabel: string;
  bitrate: number;
  container: string;
  sizeMB: number;
}

interface VideoInfo {
  title: string;
  durationSeconds: number;
  thumbnail: string;
  formats: VideoFormat[];
}

interface VideoPlayerProps {
  videoId: string | null;
  dataSaverEnabled: boolean;
  onUsageReport: (mb: number) => void;
}

export function VideoPlayer({ videoId, dataSaverEnabled, onUsageReport }: VideoPlayerProps) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // We fetch video info to know the bitrate
  useEffect(() => {
    if (!videoId) {
      setVideoInfo(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/video-info?url=https://www.youtube.com/watch?v=${videoId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.error) throw new Error(data.error);
        setVideoInfo(data);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [videoId]);

  // Data tracking loop
  useEffect(() => {
    if (!isPlaying || !videoInfo) return;

    // Determine current bitrate based on data saver
    // Data saver forces 144p usually. Without it, let's assume average 720p/1080p bitrate if not specified.
    // For estimation, we'll pick the lowest bitrate format for Data Saver, and a median/high for normal.
    let currentBitrate = 0;
    if (videoInfo.formats.length > 0) {
      if (dataSaverEnabled) {
        // Pick lowest bitrate
        currentBitrate = videoInfo.formats[videoInfo.formats.length - 1].bitrate;
      } else {
        // Pick best available or a decent default
        currentBitrate = videoInfo.formats[0].bitrate;
      }
    } else {
      // Fallback estimations if ytdl-core couldn't extract formats
      currentBitrate = dataSaverEnabled ? 250000 : 2500000; // 250kbps vs 2.5Mbps
    }

    const interval = setInterval(() => {
      // Calculate MB per second: (bitrate bits/sec) / 8 / 1024 / 1024
      const mbPerSecond = currentBitrate / 8 / 1024 / 1024;
      onUsageReport(mbPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, dataSaverEnabled, videoInfo, onUsageReport]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = PLAYING
    setIsPlaying(event.data === 1);
  };

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
        <p className="text-neutral-500">Paste a YouTube URL above to start watching.</p>
      </div>
    );
  }

  // Data Saver Trick: We render the iframe at 200x112 (16:9) and CSS transform scale it up.
  // This tricks YouTube's adaptive bitrate into serving the lowest quality.
  const containerStyle = dataSaverEnabled ? {
    width: '100%',
    height: '100%',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  } : {
    width: '100%',
    height: '100%',
    position: 'relative' as const,
  };

  const playerOpts = dataSaverEnabled ? {
    width: '200',
    height: '112',
    playerVars: {
      autoplay: 1,
      playsinline: 1,
    }
  } : {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      playsinline: 1,
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg ring-1 ring-white/10 group">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10 p-6 text-center text-red-400">
            {error}
          </div>
        )}

        <div style={containerStyle}>
          {/* We use a wrapper to handle the CSS scaling */}
          <div className={dataSaverEnabled ? "absolute top-0 left-0 w-[200px] h-[112px]" : "w-full h-full"}
               style={dataSaverEnabled ? { transform: 'scale(calc(100vw / 200))', transformOrigin: 'top left', minWidth: '100%', minHeight: '100%' } : {}}>
             {/* Actual dynamic scale calculation is tricky pure CSS when container size varies.
                 Using a simpler approach: scale(5) usually covers most container sizes.
                 Or we can use a resize observer. For simplicity, we'll use a CSS trick:
                 We set width/height to 200x112 on iframe, and use CSS transform to scale it up. */}
            <YouTube
              videoId={videoId}
              opts={playerOpts}
              onReady={onReady}
              onStateChange={onStateChange}
              className={dataSaverEnabled ? "pointer-events-none" : "w-full h-full"}
              iframeClassName="w-full h-full"
            />
          </div>
          {dataSaverEnabled && (
             <div className="absolute inset-0 z-20" onClick={() => {
                // Since pointer-events are none to allow scale without weird controls stretching,
                // we handle clicks to play/pause.
                if (playerRef.current) {
                  if (isPlaying) {
                    playerRef.current.pauseVideo();
                  } else {
                    playerRef.current.playVideo();
                  }
                }
             }}>
               {/* Invisible overlay for clicks when in datasaver */}
               {!isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                   <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                     <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   </div>
                 </div>
               )}
             </div>
          )}
        </div>
      </div>

      {videoInfo && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white line-clamp-2">{videoInfo.title}</h2>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
             {videoInfo.formats.slice(0, 4).map((f, i) => (
               <div key={i} className="flex flex-col p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                 <span className="text-xs text-neutral-500 font-medium">{f.qualityLabel}</span>
                 <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">{f.sizeMB} MB</span>
               </div>
             ))}
          </div>
          <p className="mt-3 text-xs text-neutral-400">
             * Estimated sizes for full video length based on average bitrate.
          </p>
        </div>
      )}
    </div>
  );
}
