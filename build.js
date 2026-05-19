const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const zipPath = path.join(__dirname, "bluestream-catalogue-deploy.zip");
const targets = ["public/index.html", "api/enquiry.js"];

if (!fs.existsSync(zipPath)) {
  throw new Error("Missing bluestream-catalogue-deploy.zip in the repository root.");
}

const zip = new AdmZip(zipPath);
const entries = zip.getEntries();

for (const target of targets) {
  const normalizedTarget = target.replace(/\\/g, "/");
  const entry = entries.find((candidate) => {
    const name = candidate.entryName.replace(/\\/g, "/");
    return !candidate.isDirectory && (name === normalizedTarget || name.endsWith(`/${normalizedTarget}`));
  });

  if (!entry) {
    throw new Error(`Could not find ${target} inside bluestream-catalogue-deploy.zip.`);
  }

  const outputPath = path.join(__dirname, target);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, entry.getData());
  console.log(`Extracted ${target}`);
}
