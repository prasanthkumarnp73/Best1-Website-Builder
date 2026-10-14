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
    assert.ok(fs.existsSync(path.join(categoryDirectory, "images", "hero.jpg")), `Missing ${category} hero photo`);
    for (let index = 1; index <= 3; index += 1) {
      assert.ok(fs.existsSync(path.join(categoryDirectory, "images", `product-${index}.jpg`)), `Missing ${category} product photo ${index}`);
    }
  }
});

test("each business category has offline-ready CC0 photos and source records", () => {
  const photoAssets = JSON.parse(fs.readFileSync(path.join(projectRoot, "templates", "photo-assets.json"), "utf8"));
  assert.equal(photoAssets.license, "CC0 1.0");
  for (const category of Object.keys(categoryDefinitions)) {
    const records = photoAssets.categories[category]?.photos || [];
    assert.equal(records.length, 4, `Expected four photo records for ${category}`);
    const photoIds = records.map((photo) => photo.openverseRecord);
    for (const photoId of new Set(photoIds)) {
      const uses = photoIds.filter((candidate) => candidate === photoId).length;
      if (uses > 1) {
        assert.ok(records.filter((photo) => photo.openverseRecord === photoId).slice(1).every((photo) => photo.reusedPhoto), `Repeated source photos must be labelled for ${category}`);
      }
    }
    for (const photo of records) {
      const photoPath = path.join(projectRoot, "templates", category, "images", photo.filename);
      const bytes = fs.readFileSync(photoPath);
      assert.equal(photo.license, "CC0 1.0", `Expected CC0 photo for ${category}/${photo.filename}`);
      assert.equal(bytes[0], 0xff, `Expected JPEG photo for ${category}/${photo.filename}`);
      assert.equal(bytes[1], 0xd8, `Expected JPEG photo for ${category}/${photo.filename}`);
      assert.ok(bytes.length > 8_000, `Expected a non-empty photo for ${category}/${photo.filename}`);
    }
  }
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
