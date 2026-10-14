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

const sceneByCategory = {
  automotive: "automotive", "advocate-office": "legal", bakery: "bakery",
  "bangles-earrings": "jewelry", business: "business", "civil-construction": "construction",
  clothing: "clothing", "cycle-shop": "bicycle", "doctor-clinic": "medical",
  electronics: "electronics", ecommerce: "shopping", "fancy-store": "gift",
  "fish-market": "fish", "fruit-shop": "fruit", "general-business": "storefront",
  grocery: "groceries", hotel: "hotel", "idly-shop": "idly", pharmacy: "pharmacy",
  portfolio: "creative", restaurant: "restaurant", "roadside-shop": "market-stall",
  salon: "salon", "toy-shop": "toys", "watch-shop": "watch"
};

function drawScene(scene, color, accent, index) {
  const stroke = `stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"`;
  const scenes = {
    automotive: `<path d="M202 313h26l35-74q10-21 34-21h148q25 0 40 24l37 71h18q15 0 15 16v47H190v-43q0-20 12-20" fill="${accent}" ${stroke}/><path d="m283 238-29 65h260l-34-65q-8-15-24-15H310q-18 0-27 15" fill="#fff" opacity=".78" ${stroke}/><circle cx="278" cy="377" r="34" fill="#303a36" ${stroke}/><circle cx="477" cy="377" r="34" fill="#303a36" ${stroke}/><circle cx="278" cy="377" r="12" fill="#fff"/><circle cx="477" cy="377" r="12" fill="#fff"/>`,
    legal: `<path d="M360 179v218m-69 0h138m-69-218h99m-99 48h-99" fill="none" ${stroke}/><path d="m261 227-47 86h94zm198 0-47 86h94z" fill="${accent}" ${stroke}/><path d="M214 313q0 51 47 51t47-51m104 0q0 51 47 51t47-51" fill="${accent}" ${stroke}/><path d="M310 397h100v24H310z" fill="#fff" ${stroke}/>`,
    bakery: `<path d="M220 320q0-83 64-100 20-51 76-34 54-19 79 29 61 21 61 105v47H220z" fill="${accent}" ${stroke}/><path d="M296 238q-22 24-22 58m81-85q-17 29-14 58m80-45q-14 25-10 49" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><path d="M210 376h300" ${stroke}/><circle cx="255" cy="405" r="11" fill="${color}"/><circle cx="325" cy="405" r="11" fill="${color}"/><circle cx="395" cy="405" r="11" fill="${color}"/><circle cx="465" cy="405" r="11" fill="${color}"/>`,
    jewelry: `<path d="M267 251a93 93 0 1 1 186 0v94a93 93 0 1 1-186 0z" fill="none" stroke="${accent}" stroke-width="20"/><path d="M361 213c-31 39-48 65-48 88a48 48 0 0 0 96 0c0-23-17-49-48-88" fill="${accent}" ${stroke}/><circle cx="361" cy="301" r="19" fill="#fff"/>`,
    business: `<rect x="224" y="222" width="275" height="181" rx="14" fill="#fff" ${stroke}/><path d="M260 359l57-57 43 36 76-80" fill="none" stroke="${accent}" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/><path d="M260 375h204" fill="none" ${stroke}/><circle cx="282" cy="263" r="9" fill="${accent}"/><circle cx="316" cy="263" r="9" fill="${accent}"/><circle cx="350" cy="263" r="9" fill="${accent}"/>`,
    construction: `<path d="M226 405h280V255H226z" fill="#fff" ${stroke}/><path d="M226 255 366 184l140 71" fill="${accent}" ${stroke}/><path d="M275 405V303h70v102m35 0V303h80v102" fill="none" ${stroke}/><path d="M196 431h342M366 184V137m-85 47h170" fill="none" ${stroke}/><path d="m281 184 20-26m150 26-20-26" ${stroke}/>`,
    clothing: `<path d="M360 180v45m0-1q-61-54-74 11l-58 29 34 60 36-16v112h124V308l36 16 34-60-58-29q-13-65-74-11" fill="${accent}" ${stroke}/><path d="M320 193q40 54 80 0" fill="none" stroke="#fff" stroke-width="12"/>`,
    bicycle: `<circle cx="260" cy="347" r="76" fill="none" ${stroke}/><circle cx="466" cy="347" r="76" fill="none" ${stroke}/><path d="m260 347 75-111 60 111H260l42-66h94m-61-45h-44m104 0h28" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M331 224h-39m102 0h38" fill="none" ${stroke}/>`,
    medical: `<path d="M360 193c-35-44-110-12-110 48 0 63 110 145 110 145s110-82 110-145c0-60-75-92-110-48" fill="#fff" ${stroke}/><path d="M337 245h46v32h32v46h-32v32h-46v-32h-32v-46h32z" fill="${accent}"/>`,
    electronics: `<rect x="218" y="202" width="284" height="185" rx="16" fill="#fff" ${stroke}/><rect x="244" y="228" width="232" height="132" rx="6" fill="${accent}"/><path d="M195 408h330l-27 25H222z" fill="${color}" ${stroke}/><path d="M298 267h124m-124 32h87" stroke="#fff" stroke-width="13" stroke-linecap="round"/>`,
    shopping: `<path d="M245 245h230l28 183H217z" fill="${accent}" ${stroke}/><path d="M302 252v-36a58 58 0 0 1 116 0v36" fill="none" ${stroke}/><path d="M291 318h138" stroke="#fff" stroke-width="15" stroke-linecap="round"/>`,
    gift: `<path d="M222 272h276v163H222z" fill="${accent}" ${stroke}/><path d="M206 238h308v62H206z" fill="#fff" ${stroke}/><path d="M360 238v197" fill="none" ${stroke}/><path d="M360 238c-97-4-99-82-45-75 34 4 45 75 45 75zm0 0c97-4 99-82 45-75-34 4-45 75-45 75" fill="${accent}" ${stroke}/>`,
    fish: `<path d="M207 306q74-111 200-48l76-55v161l-76-55q-126 63-200-48" fill="${accent}" ${stroke}/><circle cx="290" cy="293" r="9" fill="${color}"/><path d="M333 283q29 24 0 48m41-61q40 37 0 74" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`,
    fruit: `<path d="M360 231c-93-28-139 32-112 119 25 83 84 93 112 48 28 45 87 35 112-48 27-87-19-147-112-119" fill="${accent}" ${stroke}/><path d="M360 232q-8-55 40-72m-42 76q-52-41-91-13" fill="none" stroke="#47785e" stroke-width="18" stroke-linecap="round"/><path d="M360 238v118" stroke="#fff" stroke-width="8" opacity=".6"/>`,
    storefront: `<path d="M224 265h272v170H224z" fill="#fff" ${stroke}/><path d="m204 265 31-82h250l31 82" fill="${accent}" ${stroke}/><path d="M210 265h300m-247 0v-68m72 68v-68m72 68v-68m72 68v-68" fill="none" stroke="#fff" stroke-width="12"/><path d="M328 327h64v108h-64z" fill="${accent}" ${stroke}/><path d="M246 310h55v48h-55z" fill="${accent}"/>`,
    groceries: `<path d="M238 244h245l-22 191H260z" fill="#fff" ${stroke}/><path d="M264 271h190l-14 64H278z" fill="${accent}"/><circle cx="310" cy="373" r="27" fill="#df7453"/><circle cx="374" cy="384" r="29" fill="#e8bc55"/><circle cx="432" cy="369" r="25" fill="#6b9a64"/><path d="M310 345q0-28 22-31m42 42q-4-27 20-34m38 24q0-28 22-34" fill="none" stroke="#47785e" stroke-width="9" stroke-linecap="round"/>`,
    hotel: `<path d="M228 424V213l132-53 132 53v211z" fill="#fff" ${stroke}/><path d="M273 424V332h173v92" fill="${accent}" ${stroke}/><path d="M270 244h34v42h-34zm69 0h42v42h-42zm75 0h34v42h-34z" fill="${accent}"/><path d="M255 306h211" fill="none" ${stroke}/>`,
    idly: `<ellipse cx="360" cy="343" rx="175" ry="64" fill="#fff" ${stroke}/><ellipse cx="360" cy="327" rx="140" ry="44" fill="${accent}"/><circle cx="296" cy="313" r="31" fill="#fff"/><circle cx="361" cy="305" r="31" fill="#fff"/><circle cx="426" cy="313" r="31" fill="#fff"/><ellipse cx="308" cy="366" rx="33" ry="19" fill="#71945f"/><ellipse cx="408" cy="367" rx="38" ry="19" fill="#d89b48"/>`,
    pharmacy: `<path d="M285 220h150v188H285z" rx="18" fill="#fff" ${stroke}/><path d="M306 184h108v49H306z" fill="${accent}" ${stroke}/><path d="M335 272h50v30h30v50h-30v30h-50v-30h-30v-50h30z" fill="${accent}"/><path d="M462 296h50v112h-50z" fill="#fff" ${stroke}/><path d="M466 325h42v31h-42z" fill="${accent}"/>`,
    creative: `<rect x="224" y="193" width="272" height="220" rx="12" fill="#fff" ${stroke}/><path d="M265 354q41-114 91-40t95-75" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/><circle cx="285" cy="245" r="13" fill="${accent}"/><circle cx="328" cy="245" r="13" fill="${color}"/><circle cx="371" cy="245" r="13" fill="#e5bd64"/><path d="M253 431h214" fill="none" ${stroke}/>`,
    restaurant: `<ellipse cx="360" cy="326" rx="141" ry="109" fill="#fff" ${stroke}/><ellipse cx="360" cy="326" rx="98" ry="71" fill="${accent}"/><path d="M283 190v89m-19-89v46m38-46v46m142-46v91m-19-91v47m38-47v47" fill="none" ${stroke}/><path d="M337 325q23-34 46 0 23-34 46 0" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/>`,
    "market-stall": `<path d="M215 267h290v168H215z" fill="#fff" ${stroke}/><path d="m196 267 37-89h254l37 89" fill="${accent}" ${stroke}/><path d="M201 267h318m-253 0v-72m76 72v-72m76 72v-72" fill="none" stroke="#fff" stroke-width="13"/><path d="M251 323h59v48h-59zm83 0h59v48h-59zm83 0h59v48h-59z" fill="${accent}"/><path d="M336 435v-39h49v39" fill="none" ${stroke}/>`,
    salon: `<path d="M242 207v210m236-210v210" fill="none" ${stroke}/><rect x="260" y="194" width="200" height="208" rx="94" fill="#fff" ${stroke}/><ellipse cx="360" cy="277" rx="58" ry="69" fill="${accent}"/><path d="M308 286q-5 104 52 104t52-104" fill="${color}" opacity=".55"/><path d="m274 431 64-71m-64 0 64 71m78-71v71m0-71q50 0 50 36t-50 35" fill="none" ${stroke}/>`,
    toys: `<circle cx="304" cy="294" r="57" fill="${accent}" ${stroke}/><path d="m265 251-22-40 54 14m80 26 22-40-54 14" fill="${accent}" ${stroke}/><circle cx="286" cy="288" r="7" fill="${color}"/><circle cx="322" cy="288" r="7" fill="${color}"/><path d="M287 315q17 16 34 0" fill="none" ${stroke}/><circle cx="437" cy="359" r="51" fill="#fff" ${stroke}/><path d="m402 324 70 70m0-70-70 70" fill="none" stroke="${accent}" stroke-width="12"/>`,
    watch: `<circle cx="360" cy="300" r="100" fill="#fff" ${stroke}/><path d="M332 202v-47h56v47m-56 196v47h56v-47" fill="${accent}" ${stroke}/><circle cx="360" cy="300" r="73" fill="${accent}"/><path d="M360 247v57l42 27" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/><circle cx="360" cy="300" r="9" fill="#fff"/>`
  };
  return scenes[scene] || scenes.storefront;
}

function createIllustration(category, definition, product, index) {
  const title = escapeXml(product || definition.name);
  const categoryName = escapeXml(definition.name.toUpperCase());
  const color = definition.color;
  const accent = ["#e7bf77", "#d69d85", "#aac3a2"][index % 3];
  const scene = sceneByCategory[category];
  if (!scene) throw new Error(`No business artwork is configured for "${category}".`);
  const drawing = drawScene(scene, color, accent, index);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 560" role="img" aria-labelledby="title desc" data-scene="${scene}">
  <title id="title">${title} from ${categoryName}</title>
  <desc id="desc">A locally generated ${scene} illustration for ${categoryName.toLowerCase()}.</desc>
  <defs><linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fbfaf6"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
  <rect width="720" height="560" fill="url(#wash)"/>
  <circle cx="580" cy="112" r="96" fill="${color}" opacity=".1"/>
  <circle cx="124" cy="443" r="97" fill="${accent}" opacity=".28"/>
  <path d="M0 444q173-64 350-6t370-3v125H0z" fill="${color}" opacity=".12"/>
  <rect x="142" y="98" width="436" height="344" rx="26" fill="#fff" opacity=".5"/>
  ${drawing}
  <text x="360" y="490" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3">${categoryName}</text>
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
  fs.writeFileSync(path.join(imagesRoot, "hero.svg"), createIllustration(category, definition, definition.name, 0), "utf8");
  definition.products.forEach((product, index) => {
    fs.writeFileSync(
      path.join(imagesRoot, `product-${index + 1}.svg`),
      createIllustration(category, definition, product.name, index + 1),
      "utf8"
    );
  });
}

console.log(`Prepared ${Object.keys(categoryDefinitions).length} business template folders.`);
