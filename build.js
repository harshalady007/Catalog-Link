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

function getProductEntry(id, label) {
  const marker = `  { id:${id},`;
  const start = html.indexOf(marker);
  if (start < 0) {
    return null;
  }
  const next = html.indexOf("  { id:", start + marker.length);
  if (next < 0) {
    throw new Error(`Could not find product boundary after ${label}.`);
  }
  return { start, next, entry: html.slice(start, next) };
}

function setProductImage({ id, label, expectedText, imageUrl }) {
  const product = getProductEntry(id, label);
  if (!product) {
    throw new Error(`Could not find product ${label}.`);
  }
  if (!product.entry.includes(expectedText)) {
    throw new Error(`Product boundary check failed for ${label}.`);
  }
  const updatedEntry = product.entry.replace(/imageUrl:\\"[^\\"]*\\"/, `imageUrl:\\"${imageUrl}\\"`);
  if (updatedEntry === product.entry) {
    throw new Error(`Could not update image for ${label}.`);
  }
  html = html.slice(0, product.start) + updatedEntry + html.slice(product.next);
  console.log(`Updated image for ${label}`);
}

[
  { id: 31, label: "Sulo 120 Ltr Without pedal", expectedText: "Sulo 120 Ltr Without pedal", imageUrl: "public/products/image1005.png" },
  { id: 34, label: "Sulo 360 Ltr", expectedText: "Sulo 360 Ltr", imageUrl: "public/products/image1006.png" },
  { id: 36, label: "Plastic Gogic Bin 120 Ltr without pedal", expectedText: "Plastic Gogic Bin 120 Ltr without pedal", imageUrl: "public/products/image1001.png" },
  { id: 55, label: "Kava Swing Top", expectedText: "Kava Swing Top", imageUrl: "public/products/image21.png" },
  { id: 56, label: "Laksha I", expectedText: "Laksha I", imageUrl: "public/products/image1023.png" },
].forEach(setProductImage);

const availabilityStockFilterBlock = [
  "\\n          <div className=\\\"sidebar-section\\\">",
  "\\n            <div className=\\\"sidebar-section-title\\\">Availability<\\/div>",
  "\\n            <div className=\\\"toggle-wrap\\\">",
  "\\n              <span className=\\\"toggle-label\\\">In Stock Only<\\/span>",
  "\\n              <label className=\\\"toggle\\\">",
  "\\n                <input type=\\\"checkbox\\\" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />",
  "\\n                <span className=\\\"toggle-slider\\\"><\\/span>",
  "\\n              <\\/label>",
  "\\n            <\\/div>",
  "\\n          <\\/div>",
  "\\n",
].join("");

const stockUiFixes = [
  {
    label: "stock-only state",
    old: "  const [inStockOnly, setInStockOnly] = useState(false);\\n",
    replacement: "",
  },
  {
    label: "stock-only product filter",
    old: "    if (inStockOnly) list = list.filter(p => p.stockQty && p.stockQty > 0);\\n",
    replacement: "",
  },
  {
    label: "filtered memo dependencies",
    old: "  }, [search, activeCategories, priceMin, priceMax, inStockOnly, sortBy]);\\n",
    replacement: "  }, [search, activeCategories, priceMin, priceMax, sortBy]);\\n",
  },
  {
    label: "clear filters stock reset",
    old: "    setActiveCategories([]); setPriceMin(''); setPriceMax(''); setInStockOnly(false);\\n",
    replacement: "    setActiveCategories([]); setPriceMin(''); setPriceMax('');\\n",
  },
  {
    label: "has filters stock condition",
    old: "  const hasFilters = activeCategories.length || priceMin || priceMax || inStockOnly;\\n",
    replacement: "  const hasFilters = activeCategories.length || priceMin || priceMax;\\n",
  },
  {
    label: "availability stock filter block",
    old: availabilityStockFilterBlock,
    replacement: "\\n",
  },
];

for (const fix of stockUiFixes) {
  if (html.includes(fix.old)) {
    html = html.replace(fix.old, fix.replacement);
    console.log(`Removed ${fix.label}`);
  } else {
    console.log(`Skipped ${fix.label}; it was not present`);
  }
}

const stockCountDisplayPattern = /        \{product\.stockQty != null && \(\\n          <div className=\\\"card-stock\\\">.*?\{product\.stockQty\} in stock<\\\/div>\\n        \)\}\\n/;
if (stockCountDisplayPattern.test(html)) {
  html = html.replace(stockCountDisplayPattern, "");
  console.log("Removed visible product stock counts");
} else {
  console.log("Skipped visible product stock counts; they were not present");
}

function removeProductById({ id, label, expectedText }) {
  const product = getProductEntry(id, label);
  if (!product) {
    console.log(`Skipped ${label}; it was not present`);
    return;
  }
  if (!product.entry.includes(expectedText)) {
    throw new Error(`Product boundary check failed for ${label}.`);
  }
  html = html.slice(0, product.start) + html.slice(product.next);
  console.log(`Removed ${label}`);
}

[
  { id: 24, label: "Clinical Waste Bin", expectedText: "Clinical Bin Stainless Steel" },
  { id: 8, label: "SS Pedal Bin 29 Ltr", expectedText: "BIN SS 29L 250MM DIA 650MM HIGHT WITH PEDAL" },
  { id: 9, label: "SS Pedal Bin 5 Ltr", expectedText: "BIN SS 5L WITH PEDAL" },
  { id: 20, label: "SS Pedal Bin 56 Ltr", expectedText: "BIN 56L 300MM DIA 785MM HIGHT" },
].forEach(removeProductById);

const kavaEntry = getProductEntry(55, "Kava Swing Top")?.entry || "";
const lakshaEntry = getProductEntry(56, "Laksha I")?.entry || "";
if (!kavaEntry.includes("imageUrl:\\\"public/products/image21.png\\\"")) {
  throw new Error("Kava Swing Top image cleanup failed.");
}
if (!lakshaEntry.includes("imageUrl:\\\"public/products/image1023.png\\\"")) {
  throw new Error("Laksha I image cleanup failed.");
}

const forbiddenText = [
  "inStockOnly",
  "In Stock Only",
  "stockQty &&",
  ">Availability<",
  " in stock",
  "Clinical Waste Bin",
  "Clinical Bin Stainless Steel",
  "BIN SS 29L 250MM DIA 650MM HIGHT WITH PEDAL",
  "BIN SS 5L WITH PEDAL",
  "BIN 56L 300MM DIA 785MM HIGHT",
];
for (const forbidden of forbiddenText) {
  if (html.includes(forbidden)) {
    throw new Error(`Catalogue cleanup failed; still found ${forbidden}.`);
  }
}

fs.writeFileSync(indexPath, html);
