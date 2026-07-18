// Extracts the real prototype document embedded as a JS string literal inside
// design/Website-Doctor-prototype.html (claude.ai artifact bundle) and writes
// it to design/prototype-source.html for reference (layout, CHECKS catalog).
import fs from "node:fs";

const src = fs.readFileSync("design/Website-Doctor-prototype.html", "utf8");
const start = src.indexOf('"<!DOCTYPE html>');
if (start === -1) throw new Error("embedded document not found");

// Walk the JS string literal to its unescaped closing quote.
let i = start + 1;
let out = "";
while (i < src.length) {
  const ch = src[i];
  if (ch === "\\") {
    out += ch + src[i + 1];
    i += 2;
    continue;
  }
  if (ch === '"') break;
  out += ch;
  i++;
}
const decoded = JSON.parse('"' + out + '"');
fs.writeFileSync("design/prototype-source.html", decoded);
console.log("extracted", decoded.length, "chars ->", "design/prototype-source.html");
