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
import { categoryDefinitions, detectBusinessCategory } from "./lib/business-categories.js";

dotenv.config(); // Load .env file

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const sitesDirectory = path.join(currentDirectory, "sites");
const templatesDirectory = path.join(currentDirectory, "templates");
const generatedVideosDirectory = path.join(currentDirectory, "public", "generated");
const categories = Object.keys(categoryDefinitions);
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
      filterParts.push(`[${inputIndex}:v]scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,settb=expr=1/24,setpts=N,format=yuv420p${trim}[${label}]`);
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

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function assetDirectoryUrl(assetFolder) {
  return `/sites/${encodeURIComponent(assetFolder)}`;
}

function getProducts(products, definition) {
  const suppliedProducts = Array.isArray(products)
    ? products
      .filter((product) => product && typeof product === "object" && product.name)
      .map((product) => ({
        name: String(product.name).trim(),
        description: String(product.description || "").trim()
      }))
      .filter((product) => product.name)
      .slice(0, 8)
    : [];
  return suppliedProducts.length ? suppliedProducts : definition.products;
}

function saveGeneratedSite(fileName, details, category) {
  const assetFolder = `${path.basename(fileName, ".html")}-assets`;
  const assetDirectory = path.join(sitesDirectory, assetFolder);
  const templateDirectory = path.join(templatesDirectory, category);
  const definition = categoryDefinitions[category];
  if (!definition) throw new Error(`No template definition exists for category "${category}".`);

  fs.mkdirSync(assetDirectory, { recursive: true });
  for (const assetName of ["style.css", "script.js", "pages.css"]) {
    fs.copyFileSync(path.join(templateDirectory, assetName), path.join(assetDirectory, assetName));
  }
  fs.cpSync(path.join(templateDirectory, "images"), path.join(assetDirectory, "images"), { recursive: true });
  fs.copyFileSync(path.join(templatesDirectory, "shared", "banner.js"), path.join(assetDirectory, "banner.js"));
  fs.copyFileSync(path.join(templatesDirectory, "shared", "commerce.js"), path.join(assetDirectory, "commerce.js"));

  const slug = path.basename(fileName, ".html");
  const pageUrls = {
    home: `/sites/${encodeURIComponent(fileName)}`,
    about: `/sites/${encodeURIComponent(`${slug}-about.html`)}`,
    services: `/sites/${encodeURIComponent(`${slug}-services.html`)}`,
    contact: `/sites/${encodeURIComponent(`${slug}-contact.html`)}`
  };
  const products = getProducts(details.products, definition);
  const services = details.services.length ? details.services : definition.services;
  const phoneDigits = details.phone.replace(/\D/g, "");
  const hasInternationalPhone = /^\+?\d{11,15}$/.test(details.phone.replace(/[\s()-]/g, ""));
  const phoneLink = phoneDigits ? `tel:${details.phone.replace(/[^\d+]/g, "")}` : pageUrls.contact;
  const contactEmail = details.email || "";
  const emailLink = contactEmail ? `mailto:${encodeURIComponent(contactEmail)}` : pageUrls.contact;
  const whatsappLink = hasInternationalPhone
    ? `https://wa.me/${phoneDigits}`
    : emailLink;
  const navigation = `<nav class="generated-site-nav" aria-label="Business pages"><a href="${pageUrls.home}">Home</a><a href="${pageUrls.about}">About</a><a href="${pageUrls.services}">Services</a><a href="${pageUrls.contact}">Contact Us</a></nav>`;
  const renderList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const renderProducts = (items, className) => items.map((product, index) => {
    const image = `${assetDirectoryUrl(assetFolder)}/images/product-${(index % 3) + 1}.jpg`;
    return `<article class="${className}"><img src="${image}" alt="${escapeAttribute(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || "Ask us about this product or service.")}</p><button type="button" data-add data-product="${escapeAttribute(product.name)}">Add to bag</button></div></article>`;
  }).join("");
  const offer = String(details.specialOffer || "");
  const values = {
    BUSINESS_NAME: escapeHtml(details.businessName),
    OWNER_NAME: escapeHtml(details.ownerName || "Our team"),
    CONTACT: escapeHtml(details.contact || details.phone || details.email || "Contact us for more information."),
    CATEGORY: category,
    CATEGORY_NAME: escapeHtml(definition.name),
    ASSET_PATH: assetDirectoryUrl(assetFolder),
    HOME_URL: pageUrls.home,
    ABOUT_URL: pageUrls.about,
    SERVICES_URL: pageUrls.services,
    CONTACT_URL: pageUrls.contact,
    CHECKOUT_URL: whatsappLink,
    PHONE: escapeHtml(details.phone || "Contact us for details"),
    PHONE_LINK: escapeAttribute(phoneLink),
    EMAIL: escapeHtml(contactEmail || "Contact us for details"),
    EMAIL_LINK: escapeAttribute(emailLink),
    ADDRESS: escapeHtml(details.address || "Please contact us for our location."),
    WHATSAPP_LINK: escapeAttribute(whatsappLink),
    MAP_URL: escapeAttribute(`https://maps.google.com/maps?q=${encodeURIComponent(details.address || details.businessName)}&output=embed`),
    TAGLINE: escapeHtml(details.tagline || definition.tagline),
    DESCRIPTION: escapeHtml(details.description || definition.story),
    STORY_TITLE: escapeHtml(details.storyTitle || "Good things grow when shared."),
    STORY: escapeHtml(details.story || definition.story),
    HOME_PRODUCTS: renderProducts(products.slice(0, 3), "product"),
    SERVICE_PRODUCTS: renderProducts(products, "catalog-product"),
    SERVICE_ITEMS: renderList(services.slice(0, 8)),
    SERVICE_LIST: renderList(services.slice(0, 8)),
    NAVIGATION: navigation,
    OFFER_SCRIPT: offer ? `<script>showOffer(${JSON.stringify(offer).replace(/</g, "\\u003c")});</script>` : ""
  };
  const render = (template) => template.replace(/\{\{([A-Z_]+)\}\}/g, (placeholder, key) => values[key] ?? "");
  const homepage = render(fs.readFileSync(path.join(templateDirectory, "index.html"), "utf8"));
  const homepageWithPageStyles = homepage.includes(`${assetDirectoryUrl(assetFolder)}/pages.css`)
    ? homepage
    : homepage.replace("</head>", `<link rel="stylesheet" href="${assetDirectoryUrl(assetFolder)}/pages.css">\n</head>`);
  const navigableHomepage = homepageWithPageStyles
    .replace(/<header\b/i, '<header data-generated-pages="true"')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i, navigation)
    .replace(/href=(["'])mailto:[^"']*\1/gi, `href="${escapeAttribute(emailLink)}"`)
    .replace(/href=(["'])tel:[^"']*\1/gi, `href="${escapeAttribute(phoneLink)}"`);
  let imageIndex = 0;
  const homepageWithLocalImages = navigableHomepage.replace(/(<img\b[^>]*\bsrc=)["']https?:\/\/[^"']+["']/gi, (_match, prefix) => {
    imageIndex += 1;
    const imageName = imageIndex === 1 ? "hero.jpg" : `product-${((imageIndex - 2) % 3) + 1}.jpg`;
    return `${prefix}"${assetDirectoryUrl(assetFolder)}/images/${imageName}"`;
  }).replace(
    new RegExp(`${assetDirectoryUrl(assetFolder)}/images/hero\\.svg`, "g"),
    `${assetDirectoryUrl(assetFolder)}/images/hero.jpg`
  ).replace(
    new RegExp(`${assetDirectoryUrl(assetFolder)}/images/product-(\\d+)\\.svg`, "g"),
    (_match, index) => `${assetDirectoryUrl(assetFolder)}/images/product-${((Number(index) - 1) % 3) + 1}.jpg`
  );
  fs.writeFileSync(path.join(sitesDirectory, path.basename(fileName)), homepageWithLocalImages, "utf8");

  for (const pageName of ["about", "services", "contact"]) {
    const pageTemplate = fs.readFileSync(path.join(templateDirectory, `${pageName}.html`), "utf8");
    fs.writeFileSync(path.join(sitesDirectory, `${slug}-${pageName}.html`), render(pageTemplate), "utf8");
  }
}

function migrateGeneratedSitesToRealPhotos() {
  if (!fs.existsSync(sitesDirectory)) return;
  const generatedPages = fs.readdirSync(sitesDirectory).filter((fileName) => fileName.endsWith(".html"));
  const copiedImageDirectories = new Set();
  for (const fileName of generatedPages) {
    const pagePath = path.join(sitesDirectory, fileName);
    const html = fs.readFileSync(pagePath, "utf8");
    const category = html.match(/<html\b[^>]*\bdata-category=["']([a-z0-9-]+)["']/i)?.[1];
    const imagePath = html.match(/\/sites\/([a-z0-9_-]+-assets)\/images\/hero\.svg/i);
    if (!categoryDefinitions[category] || !imagePath) continue;

    const imageDirectory = path.join(sitesDirectory, imagePath[1], "images");
    if (!copiedImageDirectories.has(imageDirectory)) {
      const templateImagesDirectory = path.join(templatesDirectory, category, "images");
      fs.mkdirSync(imageDirectory, { recursive: true });
      for (const imageName of ["hero.jpg", "product-1.jpg", "product-2.jpg", "product-3.jpg"]) {
        fs.copyFileSync(path.join(templateImagesDirectory, imageName), path.join(imageDirectory, imageName));
      }
      copiedImageDirectories.add(imageDirectory);
    }

    const updatedHtml = html
      .replace(/(\/sites\/[a-z0-9_-]+-assets\/images\/hero)\.svg/gi, "$1.jpg")
      .replace(/(\/sites\/[a-z0-9_-]+-assets\/images\/product-)(\d+)\.svg/gi, (_match, prefix, index) => (
        `${prefix}${((Number(index) - 1) % 3) + 1}.jpg`
      ));
    if (updatedHtml !== html) fs.writeFileSync(pagePath, updatedHtml, "utf8");
  }
}

migrateGeneratedSitesToRealPhotos();

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
            : "The requested intent is QUESTION. Always return type answer and never create a website."} Return only JSON with fields type (website or answer), action (create), category (one of ${categories.join(", ")}), businessName, ownerName, phone, email, address, contact, specialOffer, tagline, description, story, products (array of objects with name and description), services (array of short strings), and answer. Select the most specific category that matches the business described, such as cycle-shop for a bicycle shop, idly-shop for an idly or dosa shop, fruit-shop for a fruit shop, and roadside-shop for a roadside vendor. Infer the business name from the request when possible. Use category-specific products and services. Do not return HTML, markdown, or code. Never invent factual details such as a real address, phone, email, prices, or credentials; leave unknown details empty. Do not invent product prices.`
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

    const modelCategory = String(result.category || "").toLowerCase();
    const category = detectBusinessCategory(prompt)
      || (categories.includes(modelCategory) ? modelCategory : "general-business");
    const businessName = String(result.businessName || "My Business").trim();
    const details = {
      businessName,
      ownerName: String(result.ownerName || "").trim(),
      contact: String(result.contact || "").trim(),
      phone: String(result.phone || "").trim(),
      email: String(result.email || "").trim(),
      address: String(result.address || "").trim(),
      specialOffer: String(result.specialOffer || "").trim(),
      tagline: String(result.tagline || categoryDefinitions[category].tagline).trim(),
      description: String(result.description || "").trim(),
      story: String(result.story || "").trim(),
      storyTitle: "",
      products: Array.isArray(result.products) ? result.products.slice(0, 8) : [],
      services: Array.isArray(result.services) ? result.services.map(String).slice(0, 8) : []
    };

    const fileName = `${makeSlug(businessName)}.html`;
    saveGeneratedSite(fileName, details, category);
    return res.json({
      type: "website",
      intent: "create",
      websiteCategory: category,
      fileName,
      url: `/sites/${encodeURIComponent(fileName)}`,
      pages: {
        home: `/sites/${encodeURIComponent(fileName)}`,
        about: `/sites/${encodeURIComponent(`${makeSlug(businessName)}-about.html`)}`,
        services: `/sites/${encodeURIComponent(`${makeSlug(businessName)}-services.html`)}`,
        contact: `/sites/${encodeURIComponent(`${makeSlug(businessName)}-contact.html`)}`
      }
    });
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

export const server = app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
