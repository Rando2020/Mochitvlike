// Local files only. Never upload, approve, call a provider, or alter canon.
import sharp from "sharp";
import { readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
const path = process.argv[2];
if (!path) throw new Error("Usage: node scripts/prepare-remnant-fixture.mjs /absolute/path/remnant_casual_2.webp");
const source = await readFile(path);
const meta = await sharp(source).metadata();
if (meta.width !== 853 || meta.height !== 1280) throw new Error("Expected supplied Remnant sheet at 853x1280. Review geometry for other versions.");
const out = resolve(".local-fixtures/remnant");
await mkdir(out, { recursive: true });
await copyFile(path, join(out, "source.webp"), constants.COPYFILE_EXCL);
const checksum = bytes => createHash("sha256").update(bytes).digest("hex");
const views = [
  { label: "front", referenceRole: "FULL_BODY", crop: { left: 0, top: 0, width: 285, height: 980 } },
  { label: "back", referenceRole: "FULL_BODY", crop: { left: 285, top: 0, width: 295, height: 980 } },
  { label: "profile", referenceRole: "PROFILE", crop: { left: 575, top: 0, width: 278, height: 495 } },
  { label: "neutral-violet", referenceRole: "EXPRESSION", crop: { left: 595, top: 508, width: 115, height: 110 } }
];
const records = [];
for (const view of views) {
  const image = await sharp(source).extract(view.crop).png().toBuffer();
  await writeFile(join(out, view.label + ".png"), image, { flag: "wx" });
  records.push({ ...view, file: view.label + ".png", checksum: checksum(image), approved: false, uploaded: false });
}
await writeFile(join(out, "manifest.json"), JSON.stringify({ fixtureVersion: 1, source: "source.webp", sourceChecksum: checksum(source),
  sourceDimensions: { width: meta.width, height: meta.height }, uploaded: false, approved: false,
  rights: "Unverified; creator declaration required before any production approval.",
  warning: "Manual crop proposals. Front/back regions include neighboring hair/clothing; inspect before production. Alternate cyan/red eyes are deferred, not canonicalized.", views: records }, null, 2) + "\n", { flag: "wx" });
console.log(`Prepared ${records.length} unapproved local views and the unchanged source at ${out}`);
