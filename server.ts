import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import ytdl from "@distube/ytdl-core";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get Video Info & Sizes
  app.get("/api/video-info", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      if (!videoUrl || !ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }

      const info = await ytdl.getInfo(videoUrl);
      
      const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);
      
      // Calculate sizes for available formats
      const formats = info.formats
        .filter((f) => f.hasVideo && f.hasAudio)
        .map((f) => {
          const bitrate = f.bitrate || 0;
          // approximate size in MB
          const sizeMB = (bitrate * durationSeconds) / 8 / 1024 / 1024;
          return {
            qualityLabel: f.qualityLabel,
            bitrate,
            container: f.container,
            sizeMB: parseFloat(sizeMB.toFixed(2)),
          };
        });

      res.json({
        title: info.videoDetails.title,
        durationSeconds,
        thumbnail: info.videoDetails.thumbnails[0]?.url,
        formats: formats.sort((a, b) => b.bitrate - a.bitrate),
      });
    } catch (error: any) {
      console.error("Error fetching video info:", error);
      res.status(500).json({ error: "Failed to fetch video information." });
    }
  });

  // API Route: Get Video Size and Qualities (POST)
  app.post("/api/video-size", async (req, res) => {
    try {
      const { url } = req.body;

      // التحقق من صحة الرابط
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'رابط يوتيوب غير صالح.' });
      }

      // جلب معلومات الفيديو والمسارات المتاحة
      const info = await ytdl.getInfo(url);
      const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);

      // فلترة المسارات للحصول على الفيديوهات بصيغة MP4
      const formats = info.formats.filter(f => f.hasVideo && f.container === 'mp4');

      // حساب الحجم لكل جودة
      const qualityData = formats.map(format => {
        let sizeMB = 0;
        
        // الطريقة الأولى: إذا كان يوتيوب يوفر الحجم الدقيق مباشرة (contentLength)
        if (format.contentLength) {
          sizeMB = parseInt(format.contentLength, 10) / (1024 * 1024);
        } 
        // الطريقة الثانية: حساب تقريبي (معدل البت × الثواني ÷ 8 لتحويلها لبايت)
        else if (format.bitrate) {
          const totalBytes = (format.bitrate * durationSeconds) / 8;
          sizeMB = totalBytes / (1024 * 1024);
        }

        return {
          quality: format.qualityLabel || 'غير معروف',
          sizeMB: parseFloat(sizeMB.toFixed(2)),
          url: format.url // هذا الرابط سنستخدمه لاحقاً للتشغيل
        };
      });

      // تنظيف البيانات: إزالة الجودات المكررة والاحتفاظ بأفضل خيار لكل جودة
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
        thumbnail: info.videoDetails.thumbnails[0].url,
        qualities: uniqueQualities.sort((a, b) => parseInt(a.quality) - parseInt(b.quality)),
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الفيديو.' });
    }
  });

  // API Route: Secure Proxy for YouTube Data API
  app.get("/api/youtube-data", async (req, res) => {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
