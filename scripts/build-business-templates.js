import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { categoryDefinitions } from "../lib/business-categories.js";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatesRoot = path.join(projectRoot, "templates");
const sharedRoot = path.join(templatesRoot, "shared");
const productTemplate = fs.readFileSync(path.join(sharedRoot, "storefront.html"), "utf8");
const pageNames = ["about", "services", "contact"];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[character]);
}

function createIllustration(definition, product, index) {
  const title = escapeXml(product || definition.name);
  const categoryName = escapeXml(definition.name.toUpperCase());
  const color = definition.color;
  const accent = ["#e7bf77", "#d69d85", "#aac3a2"][index % 3];
  const x = 116 + (index * 26);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 560" role="img" aria-labelledby="title desc">
  <title id="title">${title} from ${categoryName}</title>
  <desc id="desc">A custom ${categoryName.toLowerCase()} illustration for your local business website.</desc>
  <defs><linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fbfaf6"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
  <rect width="720" height="560" fill="url(#wash)"/>
  <circle cx="564" cy="134" r="94" fill="${color}" opacity=".12"/>
  <circle cx="122" cy="453" r="106" fill="${accent}" opacity=".3"/>
  <path d="M0 430 Q190 345 358 433 T720 412 V560 H0Z" fill="${color}" opacity=".15"/>
  <rect x="206" y="122" width="308" height="294" rx="12" fill="#fff" opacity=".86"/>
  <rect x="229" y="146" width="262" height="185" rx="8" fill="${color}" opacity=".16"/>
  <circle cx="${x}" cy="237" r="49" fill="${color}" opacity=".82"/>
  <circle cx="${x + 92}" cy="227" r="33" fill="${accent}"/>
  <circle cx="${x + 158}" cy="254" r="43" fill="#f4e8cb"/>
  <path d="M${x - 21} 242q21 -41 42 0v18h-42z" fill="#fff" opacity=".8"/>
  <path d="M${x + 73} 230q19 -30 38 0v17h-38z" fill="#fff" opacity=".78"/>
  <path d="M${x + 139} 258q19 -36 38 0v18h-38z" fill="${color}" opacity=".68"/>
  <rect x="246" y="350" width="228" height="8" rx="4" fill="${color}" opacity=".2"/>
  <rect x="246" y="370" width="157" height="7" rx="3.5" fill="${color}" opacity=".13"/>
  <text x="360" y="466" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3">${categoryName}</text>
</svg>
`;
}

function createGenericHomepage(category) {
  return productTemplate.replaceAll("{{CATEGORY}}", category);
}

for (const [category, definition] of Object.entries(categoryDefinitions)) {
  const categoryRoot = path.join(templatesRoot, category);
  const imagesRoot = path.join(categoryRoot, "images");
  fs.mkdirSync(imagesRoot, { recursive: true });

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
  fs.writeFileSync(path.join(imagesRoot, "hero.svg"), createIllustration(definition, definition.name, 0), "utf8");
  definition.products.forEach((product, index) => {
    fs.writeFileSync(
      path.join(imagesRoot, `product-${index + 1}.svg`),
      createIllustration(definition, product.name, index + 1),
      "utf8"
    );
  });
}

console.log(`Prepared ${Object.keys(categoryDefinitions).length} business template folders.`);
