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
    pattern: /(\{ id:31, name:\\\"Sulo 120 Ltr Without pedal\\\"[^}]*?imageUrl:\\\")\\\"/,
    replacement: '$1public/products/image1005.png\\\"',
  },
  {
    label: "Sulo 360 Ltr",
    pattern: /(\{ id:34, name:\\\"Sulo 360 Ltr\\\"[^}]*?imageUrl:\\\")\\\"/,
    replacement: '$1public/products/image1006.png\\\"',
  },
  {
    label: "Plastic Gogic Bin 120 Ltr without pedal",
    pattern: /(\{ id:36, name:\\\"Plastic Gogic Bin 120 Ltr without pedal\\\"[^}]*?imageUrl:\\\")\\\"/,
    replacement: '$1public/products/image1001.png\\\"',
  },
  {
    label: "Laksha I",
    pattern: /(\{ id:56, name:\\\"Laksha I\\\"[^}]*?imageUrl:\\\")\\\"/,
    replacement: '$1public/products/image1023.png\\\"',
  },
];

for (const fix of productImageFixes) {
  if (!fix.pattern.test(html)) {
    throw new Error(`Could not find product image field for ${fix.label}.`);
  }
  html = html.replace(fix.pattern, fix.replacement);
  console.log(`Updated image for ${fix.label}`);
}

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

const forbiddenStockUi = ["inStockOnly", "In Stock Only", "stockQty &&", ">Availability<"];
for (const forbidden of forbiddenStockUi) {
  if (html.includes(forbidden)) {
    throw new Error(`Stock UI cleanup failed; still found ${forbidden}.`);
  }
}

fs.writeFileSync(indexPath, html);
