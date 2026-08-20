import { Router, Request, Response } from "express";
import ytdl from "@distube/ytdl-core";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables for local testing or fallback
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
} else if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
}

const apiRouter = Router();

// Helper to parse YouTube ISO 8601 duration (PT1M30S)
function parseDuration(duration: string) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// API Route: Get Video Info & Sizes
apiRouter.get("/video-info", async (req: Request, res: Response) => {
  try {
    const videoUrl = req.query.url as string;
    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    try {
      const info = await ytdl.getInfo(videoUrl);
      const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);
      
      const formats = info.formats
        .filter((f) => f.hasVideo && f.hasAudio)
        .map((f) => {
          const bitrate = f.bitrate || 0;
          const sizeMB = (bitrate * durationSeconds) / 8 / 1024 / 1024;
          return {
            qualityLabel: f.qualityLabel,
            bitrate,
            container: f.container,
            sizeMB: parseFloat(sizeMB.toFixed(2)),
          };
        });

      return res.json({
        title: info.videoDetails.title,
        durationSeconds,
        thumbnail: info.videoDetails.thumbnails[0]?.url,
        formats: formats.sort((a, b) => b.bitrate - a.bitrate),
      });
    } catch (ytdlError) {
      // Fallback
      const videoId = ytdl.getVideoID(videoUrl);
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY for fallback");
      
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
         return res.status(404).json({ error: "Video not found." });
      }
      
      const item = data.items[0];
      const durationSeconds = parseDuration(item.contentDetails.duration);
      
      const estimatedBitrates = [
        { qualityLabel: '1080p', bitrate: 8000000, container: 'mp4' },
        { qualityLabel: '720p', bitrate: 4000000, container: 'mp4' },
        { qualityLabel: '480p', bitrate: 2000000, container: 'mp4' },
        { qualityLabel: '360p', bitrate: 1000000, container: 'mp4' },
        { qualityLabel: '240p', bitrate: 500000, container: 'mp4' },
        { qualityLabel: '144p', bitrate: 250000, container: 'mp4' }
      ];

      const formats = estimatedBitrates.map(est => {
          const sizeMB = (est.bitrate * durationSeconds) / 8 / 1024 / 1024;
          return {
             qualityLabel: est.qualityLabel,
             bitrate: est.bitrate,
             container: est.container,
             sizeMB: parseFloat(sizeMB.toFixed(2)),
          }
      });

      return res.json({
         title: item.snippet.title,
         durationSeconds,
         thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
         formats: formats
      });
    }
  } catch (error: any) {
    console.error("Error fetching video info:", error);
    res.status(500).json({ error: "Failed to fetch video information." });
  }
});

// API Route: Get Video Size and Qualities (POST)
apiRouter.post("/video-size", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'رابط يوتيوب غير صالح.' });
    }

    try {
      const info = await ytdl.getInfo(url);
      const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);

      const formats = info.formats.filter(f => f.hasVideo && f.container === 'mp4');

      const qualityData = formats.map(format => {
        let sizeMB = 0;
        if (format.contentLength) {
          sizeMB = parseInt(format.contentLength, 10) / (1024 * 1024);
        } 
        else if (format.bitrate) {
          const totalBytes = (format.bitrate * durationSeconds) / 8;
          sizeMB = totalBytes / (1024 * 1024);
        }

        return {
          quality: format.qualityLabel || 'غير معروف',
          sizeMB: parseFloat(sizeMB.toFixed(2)),
          url: format.url 
        };
      });

      const uniqueQualities: any[] = [];
      const qualitySet = new Set();
      
      for (const item of qualityData) {
        if (!qualitySet.has(item.quality) && item.quality !== 'غير معروف' && item.sizeMB > 0) {
          qualitySet.add(item.quality);
          uniqueQualities.push(item);
        }
      }

      return res.json({
        title: info.videoDetails.title,
        duration: durationSeconds,
        thumbnail: info.videoDetails.thumbnails[0]?.url,
        qualities: uniqueQualities.sort((a, b) => parseInt(a.quality) - parseInt(b.quality)),
      });
    } catch (ytdlError) {
      const videoId = ytdl.getVideoID(url);
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY for fallback");
      
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
         return res.status(404).json({ error: "Video not found." });
      }
      
      const item = data.items[0];
      const durationSeconds = parseDuration(item.contentDetails.duration);
      
      const estimatedBitrates = [
        { quality: '144p', kbps: 250 },
        { quality: '240p', kbps: 500 },
        { quality: '360p', kbps: 1000 },
        { quality: '480p', kbps: 2000 },
        { quality: '720p', kbps: 4000 },
        { quality: '1080p', kbps: 8000 }
      ];
      
      const qualities = estimatedBitrates.map(est => {
          const totalBytes = (est.kbps * 1000 * durationSeconds) / 8;
          const sizeMB = totalBytes / (1024 * 1024);
          return {
             quality: est.quality,
             sizeMB: parseFloat(sizeMB.toFixed(2)),
             url: "" 
          }
      });
      
      return res.json({
         title: item.snippet.title,
         duration: durationSeconds,
         thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
         qualities: qualities
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الفيديو.' });
  }
});

// API Route: Secure Proxy for YouTube Data API
apiRouter.get("/youtube-data", async (req: Request, res: Response) => {
  const videoId = req.query.id as string;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!videoId) {
    return res.status(400).json({ success: false, error: "Missing video ID" });
  }

  if (!apiKey) {
    return res.status(500).json({ success: false, error: "YOUTUBE_API_KEY is not configured on the server." });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    res.json({ success: true, data: data });
  } catch (error) {
    console.error("Error fetching from YouTube API:", error);
    res.status(500).json({ success: false, error: "Failed to fetch data" });
  }
});

export default apiRouter;
