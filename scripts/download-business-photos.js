import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categoryDefinitions } from "../lib/business-categories.js";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatesRoot = path.join(projectRoot, "templates");
const openverseApi = "https://api.openverse.org/v1/images/";
const photosPerCategory = 4;
const searchDelay = 3200;
const searchTerms = {
  automotive: ["car dealership", "car repair", "car showroom", "automobile"],
  "advocate-office": ["law office", "lawyer"],
  bakery: ["bakery bread", "bakery"],
  "bangles-earrings": ["earrings jewelry", "bangles"],
  business: ["small business", "business owner", "shopkeeper", "entrepreneur", "local business", "corner shop"],
  "civil-construction": ["construction site", "building construction"],
  clothing: ["clothing store", "fashion boutique"],
  "cycle-shop": ["bicycle shop", "bicycle repair"],
  "doctor-clinic": ["doctor clinic", "medical clinic"],
  electronics: ["electronics store", "computer shop"],
  ecommerce: ["online shopping", "shopping products"],
  "fancy-store": ["gift shop", "home decor shop"],
  "fish-market": ["fish market", "seafood market"],
  "fruit-shop": ["fruit market", "fruit shop"],
  "general-business": ["local shop", "small business"],
  grocery: ["grocery store", "vegetable market"],
  hotel: ["hotel room", "hotel lobby"],
  "idly-shop": ["idli dosa", "dosa food"],
  pharmacy: ["pharmacy medicine", "drugstore"],
  portfolio: ["design portfolio", "creative studio", "photography studio", "designer"],
  restaurant: ["restaurant dining", "restaurant food"],
  "roadside-shop": ["street vendor", "market stall"],
  salon: ["hair salon", "beauty salon"],
  "toy-shop": ["toy store", "toys games"],
  "watch-shop": ["wristwatch", "watch store"]
};
const relevanceTerms = {
  automotive: ["car dealership", "car repair", "vehicle", "garage", "auto repair", "automobile", "mechanic", "motor", "volvo", "tire", "tyre"],
  "advocate-office": ["law office", "lawyer", "legal", "attorney", "court", "justice", "judge", "solicitor"],
  bakery: ["bakery", "baker", "bread", "pastry", "cake", "croissant", "baking", "loaf", "dough", "bagel", "brioche", "rosquillas", "dessert"],
  "bangles-earrings": ["jewelry", "jewellery", "earring", "bangle", "bracelet", "necklace", "ornament", "gold", "silver"],
  business: ["small business", "business owner", "shopkeeper", "local business", "entrepreneur", "storefront", "corner shop"],
  "civil-construction": ["construction", "building", "contractor", "scaffolding", "building site", "excavator", "crane", "architecture", "concrete"],
  clothing: ["clothing", "clothes", "apparel", "fashion", "garment", "dress", "boutique", "shoe", "tailor"],
  "cycle-shop": ["bicycle", "bike", "cycling", "cycle", "bicyclist", "bicycle shop", "bike shop", "cyclist"],
  "doctor-clinic": ["doctor", "clinic", "medical", "hospital", "physician", "patient", "nurse", "healthcare", "health center"],
  electronics: ["electronics", "computer", "laptop", "mobile", "phone", "gadget", "technology", "tablet", "camera", "device"],
  ecommerce: ["online shopping", "shopping", "retail", "package", "parcel", "product"],
  "fancy-store": ["gift shop", "gift", "decor", "interior", "home decor", "ornament", "souvenir", "accessory"],
  "fish-market": ["fish", "seafood", "fish market", "fishmonger", "crab", "salmon", "tuna", "fish stall"],
  "fruit-shop": ["fruit", "produce", "apple", "orange", "banana", "mango", "fruit cart", "vegetable", "farmer"],
  "general-business": ["local business", "shopkeeper", "storefront", "corner shop", "local shop", "small business", "small shop"],
  grocery: ["grocery", "supermarket", "vegetable", "produce", "food store", "grocer"],
  hotel: ["hotel", "hospitality", "lobby", "accommodation", "resort", "reception", "hotel room", "bedroom"],
  "idly-shop": ["idli", "idly", "dosa", "sambar", "chutney", "south indian", "indian food"],
  pharmacy: ["pharmacy", "medicine", "drugstore", "medication", "pharmacist", "drug", "pill", "prescription", "chemist"],
  portfolio: ["photography", "portfolio", "design", "creative", "artist", "camera", "studio", "designer", "workspace"],
  restaurant: ["restaurant", "dining", "food", "meal", "cafe", "dish", "cooking", "chef", "diner"],
  "roadside-shop": ["street vendor", "vendor", "market stall", "street food", "street market", "stall", "fruit cart", "hawker"],
  salon: ["salon", "hair", "barber", "beauty", "haircut", "hairstyle", "stylist", "hairdresser", "spa", "makeup"],
  "toy-shop": ["toy", "toys", "play", "game", "doll", "toy store", "children", "kids"],
  "watch-shop": ["watch", "wristwatch", "clock", "timepiece", "watch store"]
};
const excludedTitleTerms = {
  automotive: ["formerly a staples", "subway", "streetcar", "tram", "art gallery"],
  bakery: ["museum", "manuscript", "painting", "illustration", "baghdad", "midnight kitchen", "monkey bar"],
  business: ["funeral", "business jet", "business jets", "aircraft"],
  clothing: ["advertisement", "ad for", "magazine", "poster"],
  ecommerce: ["archive ref", "1890", "tailor", "butcher row"],
  "fruit-shop": ["halloween", "1775", "fungal rot"],
  grocery: ["fungal rot", "disease", "spoiled"],
  pharmacy: ["university", "animalier", "animal", "veterinary"],
  portfolio: ["war of the nations", "student blog", "english student", "sunset", "picsart"],
  restaurant: ["culinary students"],
  "bangles-earrings": ["arson"],
  "general-business": ["creative commons by", "2005_10_10"]
};

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function matchesPhrase(text, phrase) {
  const words = phrase.split(" ");
  const lastWord = words[words.length - 1];
  const pluralLastWord = lastWord.endsWith("y")
    ? `${lastWord.slice(0, -1)}ies`
    : /(?:s|x|ch|sh)$/.test(lastWord) ? `${lastWord}es` : `${lastWord}s`;
  const phrases = [phrase, [...words.slice(0, -1), pluralLastWord].join(" ")];
  return phrases.some((variant) => text.includes(` ${variant} `));
}

let lastSearchTime = 0;

async function getCategoryPhotos(category, searches) {
  let lastError;
  const candidatesByTitle = new Map();
  for (const search of searches) {
    const waitForRateLimit = searchDelay - (Date.now() - lastSearchTime);
    if (lastSearchTime && waitForRateLimit > 0) await delay(waitForRateLimit);
    lastSearchTime = Date.now();

  const url = new URL(openverseApi);
  url.searchParams.set("q", search);
  url.searchParams.set("license", "cc0");
  url.searchParams.set("source", "flickr");
  url.searchParams.set("page_size", "20");

  const response = await fetch(url, {
    headers: { "User-Agent": "Best1WebsiteBuilder/1.0 (CC0 template photo downloader)" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Openverse photo search failed for ${category}: HTTP ${response.status}`);

  const payload = await response.json();
  const candidates = (payload.results || [])
    .filter((photo) => photo.license === "cc0" && photo.width >= 450 && photo.height >= 300 && photo.id)
    .filter((photo) => photo.url && /^https:\/\//i.test(photo.url))
    .filter((photo) => new URL(photo.url).hostname.endsWith(".staticflickr.com"))
    .filter((photo) => /\.jpe?g$/i.test(new URL(photo.url).pathname))
    .filter((photo) => !photo.mature)
    .filter((photo) => {
      if (!photo.title || /logo|watermark|screenshot|diagram|map/i.test(photo.title)) return false;
      const title = ` ${photo.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
      const tags = ` ${(photo.tags || []).map((tag) => tag.name).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
      if ((excludedTitleTerms[category] || []).some((term) => title.includes(term))) return false;
      const titleMatches = relevanceTerms[category].filter((term) => matchesPhrase(title, term)).length;
      const tagMatches = relevanceTerms[category].filter((term) => matchesPhrase(tags, term)).length;
      return titleMatches > 0 || tagMatches >= 2;
    });

    for (const photo of candidates) {
      const title = photo.title.trim().toLowerCase();
      if (!candidatesByTitle.has(title)) candidatesByTitle.set(title, photo);
    }

    if (candidatesByTitle.size >= photosPerCategory) {
      return { search, photos: [...candidatesByTitle.values()] };
    }
    lastError = new Error(`Only ${candidatesByTitle.size} suitable CC0 photos found for ${category} after "${search}".`);
  }
  if (candidatesByTitle.size) return { search: searches[searches.length - 1], photos: [...candidatesByTitle.values()] };
  throw lastError || new Error(`No CC0 photos found for ${category}.`);
}

async function downloadPhoto(photo, destination, category) {
  const imageUrls = [
    photo.url,
    `https://api.openverse.org/v1/images/${encodeURIComponent(photo.id)}/thumb/`
  ];
  let lastError;
  for (const imageUrl of imageUrls) {
    try {
      const response = await fetch(imageUrl, {
        headers: { "User-Agent": "Best1WebsiteBuilder/1.0 (CC0 template photo downloader)" },
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
        throw new Error("The image provider returned a non-image file.");
      }
      const image = Buffer.from(await response.arrayBuffer());
      if (image.length < 8_000 || image.length > 12 * 1024 * 1024 || image[0] !== 0xff || image[1] !== 0xd8) {
        throw new Error("The download was not a valid JPEG photo.");
      }
      await fs.writeFile(destination, image);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Could not download ${category}/${path.basename(destination)}: ${lastError?.message || "unknown error"}`);
}

const credits = {
  source: "Openverse",
  searchUrl: "https://openverse.org/",
  license: "CC0 1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  note: "Photos are locally bundled from CC0-licensed Openverse results. CC0 does not require attribution; source records are retained here.",
  categories: {}
};

async function main() {
  let categoryIndex = 0;
  for (const category of Object.keys(categoryDefinitions)) {
    const searches = searchTerms[category];
    if (!searches) throw new Error(`No photo search terms are configured for ${category}.`);

    const { search, photos } = await getCategoryPhotos(category, searches);
    const imageDirectory = path.join(templatesRoot, category, "images");
    await fs.mkdir(imageDirectory, { recursive: true });
    const files = ["hero.jpg", "product-1.jpg", "product-2.jpg", "product-3.jpg"];
    const categoryCredits = [];

    for (const photo of photos) {
      if (categoryCredits.length === photosPerCategory) break;
      const filename = files[categoryCredits.length];
      try {
        await downloadPhoto(photo, path.join(imageDirectory, filename), category);
      } catch (error) {
        console.warn(`Skipping unavailable photo for ${category}: ${photo.title} (${error.message}).`);
        continue;
      }
      categoryCredits.push({
        filename,
        title: photo.title,
        creator: photo.creator || "Unknown",
        license: "CC0 1.0",
        licenseUrl: photo.license_url || credits.licenseUrl,
        source: photo.foreign_landing_url || photo.url,
        openverseRecord: `https://openverse.org/image/${photo.id}`
      });
    }

    if (!categoryCredits.length) {
      throw new Error(`No usable CC0 photos could be downloaded for ${category}.`);
    }
    while (categoryCredits.length < photosPerCategory) {
      const sourcePhoto = categoryCredits[0];
      const filename = files[categoryCredits.length];
      await fs.copyFile(path.join(imageDirectory, sourcePhoto.filename), path.join(imageDirectory, filename));
      categoryCredits.push({ ...sourcePhoto, filename, reusedPhoto: true });
    }
    credits.categories[category] = { search, photos: categoryCredits };
    categoryIndex += 1;
    console.log(`Downloaded ${photosPerCategory} CC0 photos for ${category}.`);
  }

  await fs.writeFile(
    path.join(templatesRoot, "photo-assets.json"),
    `${JSON.stringify(credits, null, 2)}\n`,
    "utf8"
  );
  console.log(`Prepared ${categoryIndex * photosPerCategory} real business photos across ${categoryIndex} categories.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
