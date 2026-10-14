import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { categoryDefinitions } from "../lib/business-categories.js";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatesRoot = path.join(projectRoot, "templates");
const sharedRoot = path.join(templatesRoot, "shared");
const productTemplate = fs.readFileSync(path.join(sharedRoot, "storefront.html"), "utf8");
const pageNames = ["about", "services", "contact"];
const photoNames = ["hero.jpg", "product-1.jpg", "product-2.jpg", "product-3.jpg"];

function createGenericHomepage(category) {
  return productTemplate.replaceAll("{{CATEGORY}}", category);
}

for (const category of Object.keys(categoryDefinitions)) {
  const categoryRoot = path.join(templatesRoot, category);
  const imagesRoot = path.join(categoryRoot, "images");
  fs.mkdirSync(imagesRoot, { recursive: true });

  const missingPhotos = photoNames.filter((photo) => !fs.existsSync(path.join(imagesRoot, photo)));
  if (missingPhotos.length) {
    throw new Error(
      `Missing real photos for ${category}: ${missingPhotos.join(", ")}. Run "npm run photos:download" first.`
    );
  }

  const indexPath = path.join(categoryRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, createGenericHomepage(category), "utf8");
  }
  for (const pageName of pageNames) {
    const pagePath = path.join(categoryRoot, `${pageName}.html`);
    fs.copyFileSync(path.join(sharedRoot, `${pageName}.html`), pagePath);
  }

  const stylePath = path.join(categoryRoot, "style.css");
  const scriptPath = path.join(categoryRoot, "script.js");
  if (!fs.existsSync(stylePath)) {
    fs.copyFileSync(path.join(templatesRoot, "ecommerce", "style.css"), stylePath);
  }
  if (!fs.existsSync(scriptPath)) {
    fs.copyFileSync(path.join(templatesRoot, "ecommerce", "script.js"), scriptPath);
  }

  fs.copyFileSync(path.join(sharedRoot, "pages.css"), path.join(categoryRoot, "pages.css"));
}

console.log(`Prepared ${Object.keys(categoryDefinitions).length} business template folders with bundled real photos.`);
