const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const zipPath = path.join(__dirname, 'bluestream-catalogue-deploy.zip');
const targets = ['public/index.html', 'api/enquiry.js'];
const slash = String.fromCharCode(92);
const dq = String.fromCharCode(34);
const sq = String.fromCharCode(39);
const eq = slash + dq;
const nl = slash + 'n';

if (!fs.existsSync(zipPath)) {
  throw new Error('Missing bluestream-catalogue-deploy.zip in the repository root.');
}

const zip = new AdmZip(zipPath);
const entries = zip.getEntries();

for (const target of targets) {
  const normalizedTarget = target.split(slash).join('/');
  const entry = entries.find((candidate) => {
    const name = candidate.entryName.split(slash).join('/');
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

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

function getProductEntry(id, label) {
  const marker = `  { id:${id},`;
  const start = html.indexOf(marker);
  if (start < 0) {
    return null;
  }
  const next = html.indexOf('  { id:', start + marker.length);
  if (next < 0) {
    throw new Error(`Could not find product boundary after ${label}.`);
  }
  return { start, next, entry: html.slice(start, next) };
}

function replaceProductField({ id, label, expectedText, field, value }) {
  const product = getProductEntry(id, label);
  if (!product) {
    throw new Error(`Could not find product ${label}.`);
  }
  if (!product.entry.includes(expectedText)) {
    throw new Error(`Product boundary check failed for ${label}.`);
  }

  const token = `${field}:${eq}`;
  const valueStart = product.entry.indexOf(token);
  if (valueStart < 0) {
    throw new Error(`Could not find ${field} for ${label}.`);
  }
  const actualStart = valueStart + token.length;
  const actualEnd = product.entry.indexOf(eq, actualStart);
  if (actualEnd < 0) {
    throw new Error(`Could not find ${field} end for ${label}.`);
  }

  const updatedEntry = product.entry.slice(0, actualStart) + value + product.entry.slice(actualEnd);
  html = html.slice(0, product.start) + updatedEntry + html.slice(product.next);
  console.log(`Updated ${field} for ${label}`);
}

function replaceProductNumberField({ id, label, expectedText, field, value }) {
  const product = getProductEntry(id, label);
  if (!product) {
    throw new Error(`Could not find product ${label}.`);
  }
  if (!product.entry.includes(expectedText)) {
    throw new Error(`Product boundary check failed for ${label}.`);
  }

  const token = `${field}:`;
  const valueStart = product.entry.indexOf(token);
  if (valueStart < 0) {
    throw new Error(`Could not find ${field} for ${label}.`);
  }
  const actualStart = valueStart + token.length;
  const actualEnd = product.entry.indexOf(',', actualStart);
  if (actualEnd < 0) {
    throw new Error(`Could not find ${field} end for ${label}.`);
  }

  const updatedEntry = product.entry.slice(0, actualStart) + value + product.entry.slice(actualEnd);
  html = html.slice(0, product.start) + updatedEntry + html.slice(product.next);
  console.log(`Updated ${field} for ${label}`);
}

[
  { id: 31, label: 'Sulo 120 Ltr Without pedal', expectedText: 'Sulo 120 Ltr Without pedal', imageUrl: 'public/products/image1005.png' },
  { id: 34, label: 'Sulo 360 Ltr', expectedText: 'Sulo 360 Ltr', imageUrl: 'public/products/image1006.png' },
  { id: 36, label: 'Plastic Gogic Bin 120 Ltr without pedal', expectedText: 'Plastic Gogic Bin 120 Ltr without pedal', imageUrl: 'public/products/image1001.png' },
  { id: 55, label: 'Kava Swing Top', expectedText: 'Kava Swing Top', imageUrl: 'public/products/image1022.png' },
  { id: 56, label: 'Laksha I', expectedText: 'Laksha I', imageUrl: 'public/products/image1023.png' },
].forEach((item) => replaceProductField({ ...item, field: 'imageUrl', value: item.imageUrl }));

[
  { id: 76, label: 'Oris I', expectedText: 'Oris I', category: 'Bench' },
  { id: 77, label: 'Oris II', expectedText: 'Oris II', category: 'Bench' },
  { id: 78, label: 'Oris III', expectedText: 'Oris III', category: 'Bench' },
  { id: 79, label: 'Banga I', expectedText: 'Banga I', category: 'Bench' },
].forEach((item) => replaceProductField({ ...item, field: 'category', value: item.category }));

[
  { id: 62, label: 'Jaipur II', expectedText: 'Jaipur II', unitPrice: 1980 },
].forEach((item) => replaceProductNumberField({ ...item, field: 'unitPrice', value: item.unitPrice }));

function replaceText(label, oldText, replacement) {
  if (html.includes(oldText)) {
    html = html.replace(oldText, replacement);
    console.log(`Removed ${label}`);
  } else {
    console.log(`Skipped ${label}; it was not present`);
  }
}

const availabilityStockFilterBlock = [
  nl + '          <div className=' + eq + 'sidebar-section' + eq + '>',
  nl + '            <div className=' + eq + 'sidebar-section-title' + eq + '>Availability<' + slash + '/div>',
  nl + '            <div className=' + eq + 'toggle-wrap' + eq + '>',
  nl + '              <span className=' + eq + 'toggle-label' + eq + '>In Stock Only<' + slash + '/span>',
  nl + '              <label className=' + eq + 'toggle' + eq + '>',
  nl + '                <input type=' + eq + 'checkbox' + eq + ' checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />',
  nl + '                <span className=' + eq + 'toggle-slider' + eq + '><' + slash + '/span>',
  nl + '              <' + slash + '/label>',
  nl + '            <' + slash + '/div>',
  nl + '          <' + slash + '/div>',
  nl,
].join('');

[
  {
    label: 'stock-only state',
    old: '  const [inStockOnly, setInStockOnly] = useState(false);' + nl,
    replacement: '',
  },
  {
    label: 'stock-only product filter',
    old: '    if (inStockOnly) list = list.filter(p => p.stockQty && p.stockQty > 0);' + nl,
    replacement: '',
  },
  {
    label: 'filtered memo dependencies',
    old: '  }, [search, activeCategories, priceMin, priceMax, inStockOnly, sortBy]);' + nl,
    replacement: '  }, [search, activeCategories, priceMin, priceMax, sortBy]);' + nl,
  },
  {
    label: 'clear filters stock reset',
    old: '    setActiveCategories([]); setPriceMin(' + sq + sq + '); setPriceMax(' + sq + sq + '); setInStockOnly(false);' + nl,
    replacement: '    setActiveCategories([]); setPriceMin(' + sq + sq + '); setPriceMax(' + sq + sq + ');' + nl,
  },
  {
    label: 'has filters stock condition',
    old: '  const hasFilters = activeCategories.length || priceMin || priceMax || inStockOnly;' + nl,
    replacement: '  const hasFilters = activeCategories.length || priceMin || priceMax;' + nl,
  },
  {
    label: 'availability stock filter block',
    old: availabilityStockFilterBlock,
    replacement: nl,
  },
].forEach((fix) => replaceText(fix.label, fix.old, fix.replacement));

const stockDisplayStart = '        {product.stockQty != null && (' + nl;
const stockStart = html.indexOf(stockDisplayStart);
if (stockStart >= 0) {
  const stockEndToken = '        )}' + nl;
  const stockEnd = html.indexOf(stockEndToken, stockStart + stockDisplayStart.length);
  if (stockEnd < 0) {
    throw new Error('Could not find visible product stock count boundary.');
  }
  html = html.slice(0, stockStart) + html.slice(stockEnd + stockEndToken.length);
  console.log('Removed visible product stock counts');
} else {
  console.log('Skipped visible product stock counts; they were not present');
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
  { id: 24, label: 'Clinical Waste Bin', expectedText: 'Clinical Bin Stainless Steel' },
  { id: 8, label: 'SS Pedal Bin 29 Ltr', expectedText: 'BIN SS 29L 250MM DIA 650MM HIGHT WITH PEDAL' },
  { id: 9, label: 'SS Pedal Bin 5 Ltr', expectedText: 'BIN SS 5L WITH PEDAL' },
  { id: 20, label: 'SS Pedal Bin 56 Ltr', expectedText: 'BIN 56L 300MM DIA 785MM HIGHT' },
].forEach(removeProductById);

const expectedProductText = [
  { id: 55, label: 'Kava Swing Top', field: 'imageUrl', value: 'public/products/image1022.png' },
  { id: 56, label: 'Laksha I', field: 'imageUrl', value: 'public/products/image1023.png' },
  { id: 76, label: 'Oris I', field: 'category', value: 'Bench' },
  { id: 77, label: 'Oris II', field: 'category', value: 'Bench' },
  { id: 78, label: 'Oris III', field: 'category', value: 'Bench' },
  { id: 79, label: 'Banga I', field: 'category', value: 'Bench' },
];

for (const item of expectedProductText) {
  const entry = getProductEntry(item.id, item.label)?.entry || '';
  if (!entry.includes(`${item.field}:${eq}${item.value}${eq}`)) {
    throw new Error(`${item.label} ${item.field} cleanup failed.`);
  }
}

const jaipurEntry = getProductEntry(62, 'Jaipur II')?.entry || '';
if (!jaipurEntry.includes('unitPrice:1980')) {
  throw new Error('Jaipur II price cleanup failed.');
}

const forbiddenText = [
  'inStockOnly',
  'In Stock Only',
  'stockQty &&',
  '>Availability<',
  ' in stock',
  'Clinical Waste Bin',
  'Clinical Bin Stainless Steel',
  'BIN SS 29L 250MM DIA 650MM HIGHT WITH PEDAL',
  'BIN SS 5L WITH PEDAL',
  'BIN 56L 300MM DIA 785MM HIGHT',
];

for (const forbidden of forbiddenText) {
  if (html.includes(forbidden)) {
    throw new Error(`Catalogue cleanup failed; still found ${forbidden}.`);
  }
}

fs.writeFileSync(indexPath, html);
