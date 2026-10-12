// server.js
import express from "express";
import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import ffmpegPath from "ffmpeg-static";
import multer from "multer";

dotenv.config(); // Load .env file

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const sitesDirectory = path.join(currentDirectory, "sites");
const templatesDirectory = path.join(currentDirectory, "templates");
const generatedVideosDirectory = path.join(currentDirectory, "public", "generated");
const categories = ["automotive", "business", "ecommerce", "grocery", "hotel", "portfolio", "restaurant", "salon"];
const imageExtensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const audioExtensions = {
  "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/ogg": ".ogg",
  "audio/webm": ".webm", "audio/aac": ".aac"
};
const videoExtensions = {
  "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
  "video/x-msvideo": ".avi", "video/x-matroska": ".mkv"
};
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(currentDirectory, "public")));
app.get("/sites/:assetFolder/banner.js", (req, res, next) => {
  if (!/^[a-z0-9][a-z0-9_-]*-assets$/i.test(req.params.assetFolder)) return next();
  res.sendFile(path.join(templatesDirectory, "shared", "banner.js"), (error) => {
    if (error) next(error);
  });
});
app.use("/sites", express.static(path.join(currentDirectory, "sites")));

const slideshowUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => callback(null, req.slideshowTemporaryDirectory),
    filename: (req, file, callback) => {
      const extensions = file.fieldname === "photos" ? imageExtensions
        : file.fieldname === "video" ? videoExtensions : audioExtensions;
      callback(null, `${randomUUID()}${extensions[file.mimetype]}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, callback) => {
    const validType = file.fieldname === "photos" ? Boolean(imageExtensions[file.mimetype])
      : file.fieldname === "video" ? Boolean(videoExtensions[file.mimetype])
        : file.fieldname === "music" && Boolean(audioExtensions[file.mimetype]);
    callback(validType ? null : new Error("Use JPG, PNG, or WebP photos, a supported video, and MP3, WAV, M4A, OGG, or AAC music."), validType);
  }
});

function prepareSlideshowUploads(req, res, next) {
  req.slideshowTemporaryDirectory = path.join(os.tmpdir(), `best1-slideshow-${randomUUID()}`);
  fsPromises.mkdir(req.slideshowTemporaryDirectory, { recursive: true }).then(() => {
    slideshowUpload.fields([
      { name: "photos", maxCount: 10 },
      { name: "video", maxCount: 1 },
      { name: "music", maxCount: 1 }
    ])(req, res, async (error) => {
      if (error) {
        await fsPromises.rm(req.slideshowTemporaryDirectory, { recursive: true, force: true });
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ error: error.code === "LIMIT_FILE_SIZE"
          ? "Each uploaded file must be 50 MB or smaller."
          : error.message });
      }
      next();
    });
  }).catch((error) => {
    console.error("Could not prepare slideshow uploads:", error.message);
    res.status(500).json({ error: "We could not prepare your uploads. Please try again." });
  });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { windowsHide: true });
    let errorOutput = "";
    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (chunk) => { errorOutput = (errorOutput + chunk).slice(-4000); });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${errorOutput}`));
    });
  });
}

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, ["-hide_banner", "-i", filePath], { windowsHide: true });
    let output = "";
    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (chunk) => { output += chunk; });
    process.on("error", reject);
    process.on("close", () => {
      const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      const duration = durationMatch
        ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
        : 0;
      resolve({ duration, hasAudio: /Stream #\d+:\d+[^:]*: Audio:/i.test(output) });
    });
  });
}

app.post("/api/slideshow", prepareSlideshowUploads, async (req, res) => {
  const files = req.files || {};
  let outputPath;
  const renderId = randomUUID();
  try {
    const photos = files.photos || [];
    const video = files.video?.[0];
    const uploadedMusic = files.music?.[0];
    if (!photos.length && !video) {
      return res.status(400).json({ error: "Upload at least one photo or a video before generating your video." });
    }
    const totalBytes = Object.values(files).flat().reduce((total, file) => total + file.size, 0);
    if (totalBytes > 180 * 1024 * 1024) {
      return res.status(413).json({ error: "Your combined uploads must be 180 MB or smaller." });
    }
    if (!ffmpegPath) {
      return res.status(503).json({ error: "Video rendering is unavailable on this server." });
    }

    const photoPaths = photos.map((photo) => photo.path);
    const videoPath = video?.path;
    if (!uploadedMusic) {
      return res.status(400).json({ error: "Choose or upload a background music track." });
    }
    const musicPath = uploadedMusic.path;

    await fsPromises.mkdir(generatedVideosDirectory, { recursive: true });
    const videoId = randomUUID();
    outputPath = path.join(generatedVideosDirectory, `${videoId}.mp4`);
    const args = ["-y", "-hide_banner", "-loglevel", "error", "-filter_complex_threads", "1"];
    const filterParts = [];
    const normalizedVideo = (inputIndex, label, duration) => {
      const trim = duration ? `,trim=duration=${duration}` : "";
      filterParts.push(`[${inputIndex}:v]scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p,setpts=PTS-STARTPTS${trim}[${label}]`);
      return `[${label}]`;
    };

    if (videoPath) {
      for (const photoPath of photoPaths) args.push("-loop", "1", "-t", "3", "-i", photoPath);
      const videoInputIndex = photoPaths.length;
      const videoInfo = await probeVideo(videoPath);
      if (!videoInfo.duration) {
        return res.status(400).json({ error: "We could not read the uploaded video. Try another video file." });
      }
      if (videoInfo.duration > 300) {
        return res.status(400).json({ error: "Uploaded videos must be 5 minutes or shorter." });
      }
      args.push("-t", String(videoInfo.duration), "-i", videoPath);
      for (const photoPath of [...photoPaths].reverse()) args.push("-loop", "1", "-t", "3", "-i", photoPath);

      const clips = [];
      for (let index = 0; index < photoPaths.length; index += 1) {
        clips.push(normalizedVideo(index, `intro${index}`, 3));
      }
      clips.push(normalizedVideo(videoInputIndex, "sourceVideo"));
      for (let index = 0; index < photoPaths.length; index += 1) {
        clips.push(normalizedVideo(videoInputIndex + 1 + index, `outro${index}`, 3));
      }
      filterParts.push(`${clips.join("")}concat=n=${clips.length}:v=1:a=0[v]`);

      const musicInputIndex = videoInputIndex + 1 + photoPaths.length;
      const videoAudioFilter = [
        `[${videoInputIndex}:a]adelay=delays=${photoPaths.length * 3000}:all=1[originalAudio]`,
        `[${musicInputIndex}:a]volume=0.8[musicAudio]`,
        "[originalAudio][musicAudio]amix=inputs=2:duration=longest:dropout_transition=2[a]"
      ].join(";");
      args.push("-stream_loop", "-1", "-i", musicPath);
      filterParts.push(videoInfo.hasAudio ? videoAudioFilter : `[${musicInputIndex}:a]anull[a]`);
      const outputDuration = videoInfo.duration + photoPaths.length * 6;
      args.push(
        "-filter_complex", filterParts.join(";"),
        "-map", "[v]", "-map", "[a]", "-t", String(outputDuration)
      );
    } else {
      const loopedPhotoPaths = photos.length === 1
        ? photoPaths
        : [...photoPaths, ...photoPaths.slice(0, -1).reverse()];
      loopedPhotoPaths.forEach((photoPath) => args.push("-loop", "1", "-t", "3", "-i", photoPath));

      const labels = loopedPhotoPaths.map((photoPath, index) => normalizedVideo(index, `photo${index}`, 3));
      let currentLabel = labels[0];
      for (let index = 1; index < labels.length; index += 1) {
        const outputLabel = index === labels.length - 1 ? "v" : `fade${index}`;
        const offset = (3 - 0.7) * index;
        filterParts.push(`${currentLabel}${labels[index]}xfade=transition=fade:duration=0.7:offset=${offset}[${outputLabel}]`);
        currentLabel = `[${outputLabel}]`;
      }
      if (labels.length === 1) filterParts.push(`${labels[0]}null[v]`);
      args.push("-stream_loop", "-1", "-i", musicPath);
      const musicInputIndex = loopedPhotoPaths.length;
      filterParts.push(`[${musicInputIndex}:a]anull[a]`);
      const slideshowDuration = loopedPhotoPaths.length * (3 - 0.7) + 0.7;
      args.push(
        "-filter_complex", filterParts.join(";"),
        "-map", "[v]", "-map", "[a]", "-t", String(slideshowDuration)
      );
    }

    args.push(
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-threads", "1",
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
      "-movflags", "+faststart", outputPath
    );
    await runFfmpeg(args);
    return res.json({ url: `/generated/${videoId}.mp4` });
  } catch (error) {
    console.error(`Video rendering failed [${renderId}]:`, error);
    if (outputPath) await fsPromises.rm(outputPath, { force: true }).catch(() => {});
    const failure = String(error.message || "");
    const message = /ENOSPC|No space left on device/i.test(failure)
      ? "The video service is out of temporary storage. Please try again later."
      : /EACCES|Permission denied|EROFS/i.test(failure)
        ? "The video service cannot write its output. Please contact the site administrator."
        : /ENOENT|ffmpeg.*not found/i.test(failure)
          ? "Video rendering is not installed on the server. Please contact the site administrator."
          : `We could not render your video. Please retry and share reference ${renderId} with support if it continues.`;
    return res.status(500).json({ error: message });
  } finally {
    await fsPromises.rm(req.slideshowTemporaryDirectory, { recursive: true, force: true }).catch((error) => {
      console.error("Could not clean slideshow temporary files:", error.message);
    });
  }
});

// Initialize Groq client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

// Quick check to confirm key is loaded
console.log("Groq API Key:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function makeSlug(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-business";
}

function saveGeneratedSite(fileName, details, category) {
  const assetFolder = `${path.basename(fileName, ".html")}-assets`;
  const assetDirectory = path.join(sitesDirectory, assetFolder);
  const templateDirectory = path.join(templatesDirectory, category);
  const template = fs.readFileSync(path.join(templateDirectory, "index.html"), "utf8");
  fs.mkdirSync(assetDirectory, { recursive: true });
  for (const assetName of ["style.css", "script.js"]) {
    fs.copyFileSync(path.join(templateDirectory, assetName), path.join(assetDirectory, assetName));
  }
  fs.copyFileSync(path.join(templatesDirectory, "shared", "banner.js"), path.join(assetDirectory, "banner.js"));

  const offer = String(details.specialOffer || "");
  const values = {
    BUSINESS_NAME: escapeHtml(details.businessName),
    OWNER_NAME: escapeHtml(details.ownerName || "Our team"),
    CONTACT: escapeHtml(details.contact || "Contact us for more information."),
    CATEGORY: category,
    ASSET_PATH: `/sites/${assetFolder}`,
    TAGLINE: escapeHtml(details.tagline || "A better experience, made around you."),
    DESCRIPTION: escapeHtml(details.description || "Thoughtful service and a warm welcome from our team."),
    SERVICE_ITEMS: (details.services || []).slice(0, 8).map((service) => `<li>${escapeHtml(service)}</li>`).join(""),
    OFFER_SCRIPT: offer ? `<script>showOffer(${JSON.stringify(offer).replace(/</g, "\\u003c")});</script>` : ""
  };
  const html = template.replace(/{{([A-Z_]+)}}/g, (placeholder, key) => values[key] || "");
  fs.writeFileSync(path.join(sitesDirectory, fileName), html, "utf8");
}

function findBusinessFile(businessName) {
  if (!businessName) return "";
  const expectedName = `${makeSlug(businessName)}.html`;
  return fs.existsSync(path.join(sitesDirectory, expectedName)) ? expectedName : "";
}

app.post("/ai", async (req, res) => {
  const prompt = String(req.body.prompt || "").trim();
  const intent = String(req.body.intent || "").toLowerCase();
  if (!prompt) return res.status(400).json({ error: "Enter a request first." });
  if (!["create", "question"].includes(intent)) {
    return res.status(400).json({ error: "Choose Create Website or Ask a Question." });
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${intent === "create"
            ? "The requested intent is CREATE WEBSITE. Always return type website and action create."
            : "The requested intent is QUESTION. Always return type answer and never create a website."} Return only JSON with fields type (website or answer), action (create), category (automotive, business, ecommerce, grocery, hotel, portfolio, restaurant, salon), businessName, ownerName, contact, specialOffer, tagline, description, services (array of short strings), and answer. Use grocery for fruit shops, produce markets, and grocery stores; automotive for car companies, dealerships, and garages. Use business for other clear business types. Infer the business name from the request when possible. Do not return HTML, markdown, or code. Never invent factual details such as a real address, phone, prices, or credentials.`
        },
        { role: "user", content: prompt }
      ]
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    if (intent === "question") {
      if (result.type !== "answer") {
        return res.status(502).json({ error: "We could not answer that question right now. Please try again." });
      }
      return res.json({ type: "answer", answer: String(result.answer || "Please rephrase your question.") });
    }
    if (result.type !== "website") {
      return res.status(502).json({ error: "We could not create a website from that description. Please include your business type or name." });
    }

    const category = categories.includes(String(result.category || "").toLowerCase())
      ? String(result.category).toLowerCase()
      : "business";
    const businessName = String(result.businessName || "My Business").trim();
    const details = {
      businessName,
      ownerName: String(result.ownerName || "").trim(),
      contact: String(result.contact || "").trim(),
      specialOffer: String(result.specialOffer || "").trim(),
      tagline: String(result.tagline || "").trim(),
      description: String(result.description || "").trim(),
      services: Array.isArray(result.services) ? result.services.map(String).slice(0, 8) : []
    };

    const fileName = `${makeSlug(businessName)}.html`;
    saveGeneratedSite(fileName, details, category);
    return res.json({ type: "website", intent: "create", websiteCategory: category, fileName, url: `/sites/${encodeURIComponent(fileName)}` });
  } catch (err) {
    console.error("AI request failed:", { status: err.status, code: err.code });
    if (err.status === 404 || err.code === "model_not_found") {
      return res.status(502).json({ error: "Website creation is temporarily unavailable. Please try again later." });
    }
    if (err.status === 401 || err.status === 403) {
      return res.status(502).json({ error: "Website creation is temporarily unavailable. Please try again later." });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: "Website creation is busy right now. Please wait and try again." });
    }
    return res.status(502).json({ error: "We could not complete your request. Please try again." });
  }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
