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

const indexPath = path.join(__dirname, "public", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const productImageFixes = [
  {
    label: "Sulo 120 Ltr Without pedal",
    pattern: /(\{ id:31, name:\\"Sulo 120 Ltr Without pedal\\"[^}]*?imageUrl:\\")\\"/,
    replacement: '$1public/products/image1005.png\\"',
  },
  {
    label: "Sulo 360 Ltr",
    pattern: /(\{ id:34, name:\\"Sulo 360 Ltr\\"[^}]*?imageUrl:\\")\\"/,
    replacement: '$1public/products/image1006.png\\"',
  },
  {
    label: "Laksha I",
    pattern: /(\{ id:56, name:\\"Laksha I\\"[^}]*?imageUrl:\\")\\"/,
    replacement: '$1public/products/image1023.png\\"',
  },
];

for (const fix of productImageFixes) {
  if (!fix.pattern.test(html)) {
    throw new Error(`Could not find product image field for ${fix.label}.`);
  }
  html = html.replace(fix.pattern, fix.replacement);
  console.log(`Updated image for ${fix.label}`);
}

fs.writeFileSync(indexPath, html);
