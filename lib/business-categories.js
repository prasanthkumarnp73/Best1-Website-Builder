import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(currentDirectory, "..", "templates", "categories.json");
export const categoryDefinitions = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const keywordMatchers = Object.entries(categoryDefinitions)
  .flatMap(([category, definition]) => definition.keywords.map((keyword) => ({
    category,
    keyword,
    matcher: new RegExp(`(?:^|[^a-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?:$|[^a-z0-9])`, "i")
  })))
  .sort((left, right) => right.keyword.length - left.keyword.length);

export function detectBusinessCategory(description) {
  const input = String(description || "");
  return keywordMatchers.find(({ matcher }) => matcher.test(input))?.category || "";
}
