import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { categoryDefinitions, detectBusinessCategory } from "../lib/business-categories.js";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const requiredCategories = [
  "bakery", "salon", "restaurant", "clothing", "cycle-shop", "electronics", "grocery",
  "pharmacy", "idly-shop", "hotel", "fish-market", "watch-shop", "fruit-shop", "toy-shop",
  "bangles-earrings", "civil-construction", "advocate-office", "doctor-clinic", "fancy-store",
  "roadside-shop", "general-business"
];

test("all requested business categories are defined and have four-page templates", () => {
  for (const category of requiredCategories) {
    assert.ok(categoryDefinitions[category], `Missing category definition: ${category}`);
    const categoryDirectory = path.join(projectRoot, "templates", category);
    for (const fileName of ["index.html", "about.html", "services.html", "contact.html"]) {
      assert.ok(fs.existsSync(path.join(categoryDirectory, fileName)), `Missing ${category}/${fileName}`);
    }
    assert.ok(fs.existsSync(path.join(categoryDirectory, "images", "hero.svg")), `Missing ${category} hero image`);
    const heroArtwork = fs.readFileSync(path.join(categoryDirectory, "images", "hero.svg"), "utf8");
    assert.match(heroArtwork, /data-scene="[^"]+"/, `Missing category-specific artwork for ${category}`);
    for (let index = 1; index <= 3; index += 1) {
      assert.ok(fs.existsSync(path.join(categoryDirectory, "images", `product-${index}.svg`)), `Missing ${category} product image ${index}`);
    }
  }
});

test("each business category has its own offline-ready hero illustration", () => {
  const scenes = new Set();
  for (const category of Object.keys(categoryDefinitions)) {
    const artworkPath = path.join(projectRoot, "templates", category, "images", "hero.svg");
    const artwork = fs.readFileSync(artworkPath, "utf8");
    const scene = artwork.match(/data-scene="([^"]+)"/)?.[1];
    assert.ok(scene, `Missing illustration scene for ${category}`);
    assert.ok(artwork.includes("<path") || artwork.includes("<circle"), `Missing illustrated subject for ${category}`);
    assert.ok(!scenes.has(scene), `The ${category} hero reuses the ${scene} scene`);
    scenes.add(scene);
  }
  assert.equal(scenes.size, Object.keys(categoryDefinitions).length);
});

test("business descriptions resolve to their most specific category", () => {
  const examples = new Map([
    ["I want a bakery website", "bakery"],
    ["My Cycle Shop", "cycle-shop"],
    ["I sell clothing and apparel", "clothing"],
    ["a fresh fruit shop", "fruit-shop"],
    ["an idly and dosa shop", "idly-shop"],
    ["a fish market", "fish-market"],
    ["bangles store", "bangles-earrings"],
    ["a roadside shop", "roadside-shop"],
    ["doctor clinic", "doctor-clinic"],
    ["construction contractor", "civil-construction"],
    ["toy store", "toy-shop"],
    ["watch store", "watch-shop"]
  ]);

  for (const [description, expectedCategory] of examples) {
    assert.equal(detectBusinessCategory(description), expectedCategory, description);
  }
  assert.equal(detectBusinessCategory("A new business idea"), "");
});
