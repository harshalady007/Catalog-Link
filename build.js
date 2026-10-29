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
  const nextProduct = html.indexOf('  { id:', start + marker.length);
  const productsEnd = html.indexOf('];', start + marker.length);
  const next = nextProduct >= 0 && nextProduct < productsEnd ? nextProduct : productsEnd;
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

replaceText(
  'color-aware stock calculation',
  '  const selectedUnitPrice = selectedCapacity && product.capacityPrices ? product.capacityPrices[selectedCapacity] : product.unitPrice;' + nl,
  '  const selectedUnitPrice = selectedCapacity && product.capacityPrices ? product.capacityPrices[selectedCapacity] : product.unitPrice;' + nl +
    '  const displayedStockQty = selectedColor && product.colorStock ? product.colorStock[selectedColor] : product.stockQty;' + nl,
);

replaceText(
  'color-aware stock quantity limit',
  '  const max = product.stockQty || 9999;' + nl,
  '  const max = displayedStockQty != null ? displayedStockQty : 9999;' + nl,
);

const stockDisplayStart = '        {product.stockQty != null && (' + nl;
const stockStart = html.indexOf(stockDisplayStart);
if (stockStart >= 0) {
  const stockEndToken = '        )}' + nl;
  const stockEnd = html.indexOf(stockEndToken, stockStart + stockDisplayStart.length);
  if (stockEnd < 0) {
    throw new Error('Could not find visible product stock count boundary.');
  }
  const updatedStockDisplay = [
    '        {displayedStockQty != null && (' + nl,
    '          <div className=' + eq + 'card-stock' + eq + ' style={displayedStockQty > 0 ? undefined : { color: ' + sq + '#7C0000' + sq + ' }}>' + nl,
    '            {displayedStockQty > 0 ? ' + sq + '✓ ' + sq + ' + displayedStockQty.toLocaleString() + ' + sq + ' in stock' + sq + ' : ' + sq + 'Out of stock' + sq + '}' + nl,
    '          <' + slash + '/div>' + nl,
    '        )}' + nl,
  ].join('');
  html = html.slice(0, stockStart) + updatedStockDisplay + html.slice(stockEnd + stockEndToken.length);
  console.log('Updated visible product stock counts');
} else {
  throw new Error('Could not find visible product stock counts to update.');
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
  { id: 33, label: 'Sulo 240 Ltr Without pedal', expectedText: 'Sulo 240 Ltr Without pedal' },
  { id: 35, label: 'Plastic Gogic Bin 120 Ltr with pedal', expectedText: 'Plastic Gogic Bin 120 Ltr with pedal' },
  { id: 36, label: 'Plastic Gogic Bin 120 Ltr without pedal', expectedText: 'Plastic Gogic Bin 120 Ltr without pedal' },
].forEach(removeProductById);

const inventoryUpdates = [
  { id: 1, label: 'Recycling SS 24L 3-in-1 (8L × 3)', stockQty: 229 },
  { id: 2, label: 'Recycling SS 60L 3-in-1 (20L × 3)', stockQty: 130 },
  { id: 3, label: 'Picolo Junior — 8 Ltr', stockQty: 196 },
  { id: 4, label: 'Slim Jim', stockQty: 380 },
  { id: 5, label: 'Ballerina Bin — 60 Ltr', stockQty: 0 },
  { id: 6, label: 'Picolo Senior — 25 Ltr Mirror Finish', stockQty: 6 },
  { id: 7, label: '3-in-1 Plastic Recycling Bin (Italy)', stockQty: 80 },
  { id: 10, label: 'Plastic Push Bin Grey — 35 Ltr', stockQty: 194 },
  { id: 11, label: 'Kava 2-Stream Recycle Bin', stockQty: 15 },
  { id: 12, label: 'Plastic Push Bin — 25 Ltr', stockQty: 380 },
  { id: 13, label: 'Big Belly — 25 Ltr', stockQty: 173 },
  { id: 14, label: 'SS Swing Top Mini — 6 Ltr', stockQty: 1664 },
  { id: 15, label: 'Neptune Bin', stockQty: 23 },
  { id: 16, label: 'SS Urn Mirror Finish', stockQty: 168 },
  { id: 17, label: 'Ovetto Bin (Italy)', stockQty: 50 },
  { id: 18, label: 'Picolo Brush Finish', stockQty: 30 },
  { id: 19, label: 'SS Urn Bin Brush Finish', stockQty: 104 },
  { id: 21, label: 'Ashtray Bin — Stand Type', stockQty: 18 },
  { id: 22, label: '660 Ltr Shelter Bin', stockQty: 11 },
  { id: 23, label: 'GRP Planter Box', stockQty: 70 },
  { id: 25, label: 'SS Rectangle Pedal Bin', stockQty: 0 },
  { id: 30, label: 'Sulo 120 Ltr with pedal', stockQty: 171 },
  { id: 31, label: 'Sulo 120 Ltr Without pedal', stockQty: 0 },
  { id: 32, label: 'Sulo 240 Ltr with pedal', stockQty: 650 },
  { id: 34, label: 'Sulo 360 Ltr', stockQty: 36 },
  { id: 37, label: 'Plastic Gogic Bin 240 Ltr', stockQty: 1229 },
  // Totals from the color-specific handwritten quantities.
  { id: 38, label: 'Sulo 660 Ltr Bin with Flat Lid and Wheel', stockQty: 45 },
  { id: 39, label: 'Sulo 1.1 CBM Dome Lid', stockQty: 10 },
  { id: 40, label: 'Plastic Gogic 1.1 CBM Dome Lid', stockQty: 94 },
  { id: 41, label: '1.1 CBM Galvanized Garbage Container', stockQty: 0 },
  { id: 42, label: '2.5 CBM Galvanized Garbage Container', stockQty: 4 },
  { id: 43, label: '4.5 CBM Galvanized Garbage Container', stockQty: 0 },
  { id: 44, label: 'Tuarus I Litter Bin', stockQty: 0 },
  { id: 45, label: 'Dog Pole Bin (without dispenser and signage)', stockQty: 0 },
  { id: 46, label: 'JUMBO FOODCOURT BIN-FJHK364', stockQty: 15 },
  { id: 47, label: 'LAKSH III METAL 135L-FJHK366R', stockQty: 10 },
  { id: 48, label: 'Stillo 3 Stream Bin', stockQty: 3 },
  { id: 49, label: 'Stillo 4 Stream Bin', stockQty: 2 },
  { id: 50, label: 'Alum Litter Bin', stockQty: 0 },
  { id: 51, label: 'Heritage Litter Bin', stockQty: 3 },
  { id: 52, label: 'Jaipur I Litter Bin', stockQty: 0 },
  { id: 53, label: 'Jaipur Lite Litter Bin', stockQty: 1 },
  { id: 54, label: 'Kava I Litter Bin', stockQty: 0 },
  { id: 55, label: 'Kava Swing Top', stockQty: 0 },
  { id: 56, label: 'Laksha I', stockQty: 73 },
  { id: 57, label: 'Nemo E- waste Bin', stockQty: 0 },
  { id: 58, label: 'Nemo Indoor', stockQty: 14 },
  { id: 59, label: 'Nemo outdoor', stockQty: 5 },
  { id: 60, label: 'Taurus C', stockQty: 0 },
  { id: 61, label: 'Blanc', stockQty: 0 },
  { id: 62, label: 'Jaipur II', stockQty: 0 },
  { id: 63, label: 'Jaipur III', stockQty: 0 },
  { id: 64, label: 'Kava II', stockQty: 22 },
  { id: 65, label: 'Kava III', stockQty: 1 },
  { id: 66, label: 'Laksha II', stockQty: 11 },
  { id: 67, label: 'Laksha III', stockQty: 0 },
  { id: 68, label: 'Oris Bike Rack', stockQty: 0 },
  { id: 69, label: 'Kava Bike Rack', stockQty: 0 },
  { id: 70, label: 'Taurus Bike Rack - 2m length', stockQty: 0 },
  { id: 71, label: 'Heritage I Bench', stockQty: 0 },
  { id: 72, label: 'Heritage II Bench', stockQty: 2 },
  { id: 73, label: 'Heritage III Bench', stockQty: 3 },
  { id: 74, label: 'Laksha Picnic Table', stockQty: 2 },
  { id: 75, label: 'Luma Bench', stockQty: 0 },
  { id: 76, label: 'Oris I', stockQty: 0 },
  { id: 77, label: 'Oris II', stockQty: 0 },
  { id: 78, label: 'Oris III', stockQty: 1 },
  { id: 79, label: 'Banga I', stockQty: 2 },
  { id: 80, label: 'Preacast Bench', stockQty: 22 },
];

inventoryUpdates.forEach((item) => replaceProductNumberField({
  ...item,
  expectedText: item.label,
  field: 'stockQty',
  value: item.stockQty,
}));

if (inventoryUpdates.length !== 69) {
  throw new Error(`Expected 69 inventory updates, found ${inventoryUpdates.length}.`);
}

function appendProductFields({ id, label, fields }) {
  const product = getProductEntry(id, label);
  if (!product || !product.entry.includes(label)) {
    throw new Error(`Could not find product ${label} while appending fields.`);
  }
  const closing = product.entry.lastIndexOf(' }');
  if (closing < 0) {
    throw new Error(`Could not find product closing boundary for ${label}.`);
  }
  const updatedEntry = product.entry.slice(0, closing) + `, ${fields}` + product.entry.slice(closing);
  html = html.slice(0, product.start) + updatedEntry + html.slice(product.next);
  console.log(`Added color inventory for ${label}`);
}

const nemoIndoorColorStock = {
  Green: 14,
  'Light Green': 0,
  Red: 0,
  'Light Blue': 0,
  Blue: 0,
  Brown: 0,
};
const encodeProductString = (value) => eq + value + eq;
const nemoIndoorColors = Object.keys(nemoIndoorColorStock);
appendProductFields({
  id: 58,
  label: 'Nemo Indoor',
  fields: [
    `colors:[${nemoIndoorColors.map(encodeProductString).join(',')}]`,
    `colorStock:{${Object.entries(nemoIndoorColorStock).map(([color, quantity]) => `${encodeProductString(color)}:${quantity}`).join(',')}}`,
  ].join(', '),
});

function increaseAllProductPrices(multiplier) {
  const productsStart = html.indexOf('const ALL_PRODUCTS = [');
  if (productsStart < 0) {
    throw new Error('Could not find ALL_PRODUCTS while increasing prices.');
  }
  const productsEnd = html.indexOf('];', productsStart);
  if (productsEnd < 0) {
    throw new Error('Could not find ALL_PRODUCTS boundary while increasing prices.');
  }

  const productsBlock = html.slice(productsStart, productsEnd + 2);
  const increase = (value) => String(Math.round(Number(value) * multiplier));
  let unitPriceCount = 0;
  let capacityPriceCount = 0;

  let updatedBlock = productsBlock.replace(/unitPrice:(\d+(?:\.\d+)?)/g, (_match, value) => {
    unitPriceCount += 1;
    return `unitPrice:${increase(value)}`;
  });

  updatedBlock = updatedBlock.replace(/capacityPrices:\{([^}]*)\}/g, (_match, body) => {
    const updatedBody = body.replace(/:(\d+(?:\.\d+)?)/g, (_priceMatch, value) => {
      capacityPriceCount += 1;
      return `:${increase(value)}`;
    });
    return `capacityPrices:{${updatedBody}}`;
  });

  if (unitPriceCount === 0 && capacityPriceCount === 0) {
    throw new Error('No catalogue prices were increased.');
  }

  html = html.slice(0, productsStart) + updatedBlock + html.slice(productsEnd + 2);
  console.log(`Increased catalogue prices by ${Math.round((multiplier - 1) * 100)}% (${unitPriceCount} unit prices, ${capacityPriceCount} capacity prices)`);
}

increaseAllProductPrices(1.2);

function halveProductPrice({ id, label }) {
  const product = getProductEntry(id, label);
  if (!product) {
    throw new Error(`Could not find product ${label} while applying the quantity discount.`);
  }
  if (!product.entry.includes(label)) {
    throw new Error(`Product boundary check failed for ${label} while applying the quantity discount.`);
  }

  const match = product.entry.match(/unitPrice:(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not find a numeric unitPrice for ${label}.`);
  }

  const halvedPrice = Number(match[1]) / 2;
  replaceProductNumberField({
    id,
    label,
    expectedText: label,
    field: 'unitPrice',
    value: String(halvedPrice),
  });
  console.log(`Reduced ${label} from AED ${match[1]} to AED ${halvedPrice}`);
}

const quantityDiscountProducts = [
  { id: 1, label: 'Recycling SS 24L 3-in-1 (8L × 3)' },
  { id: 2, label: 'Recycling SS 60L 3-in-1 (20L × 3)' },
  { id: 3, label: 'Picolo Junior — 8 Ltr' },
  { id: 4, label: 'Slim Jim' },
  { id: 6, label: 'Picolo Senior — 25 Ltr Mirror Finish' },
  { id: 7, label: '3-in-1 Plastic Recycling Bin (Italy)' },
  { id: 10, label: 'Plastic Push Bin Grey — 35 Ltr' },
  { id: 11, label: 'Kava 2-Stream Recycle Bin' },
  { id: 12, label: 'Plastic Push Bin — 25 Ltr' },
  { id: 13, label: 'Big Belly — 25 Ltr' },
  { id: 14, label: 'SS Swing Top Mini — 6 Ltr' },
  { id: 15, label: 'Neptune Bin' },
  { id: 16, label: 'SS Urn Mirror Finish' },
  { id: 17, label: 'Ovetto Bin (Italy)' },
  { id: 18, label: 'Picolo Brush Finish' },
  { id: 19, label: 'SS Urn Bin Brush Finish' },
  { id: 21, label: 'Ashtray Bin — Stand Type' },
  { id: 22, label: '660 Ltr Shelter Bin' },
  { id: 23, label: 'GRP Planter Box' },
  { id: 30, label: 'Sulo 120 Ltr with pedal' },
  { id: 31, label: 'Sulo 120 Ltr Without pedal' },
  { id: 32, label: 'Sulo 240 Ltr with pedal' },
  { id: 34, label: 'Sulo 360 Ltr' },
  { id: 38, label: 'Sulo 660 Ltr Bin with Flat Lid and Wheel' },
  { id: 39, label: 'Sulo 1.1 CBM Dome Lid' },
  { id: 40, label: 'Plastic Gogic 1.1 CBM Dome Lid' },
  { id: 42, label: '2.5 CBM Galvanized Garbage Container' },
  { id: 46, label: 'JUMBO FOODCOURT BIN-FJHK364' },
  { id: 47, label: 'LAKSH III METAL 135L-FJHK366R' },
  { id: 48, label: 'Stillo 3 Stream Bin' },
  { id: 49, label: 'Stillo 4 Stream Bin' },
  { id: 51, label: 'Heritage Litter Bin' },
  { id: 53, label: 'Jaipur Lite Litter Bin' },
  { id: 56, label: 'Laksha I' },
  { id: 58, label: 'Nemo Indoor' },
  { id: 59, label: 'Nemo outdoor' },
  { id: 64, label: 'Kava II' },
  { id: 65, label: 'Kava III' },
  { id: 66, label: 'Laksha II' },
  { id: 72, label: 'Heritage II Bench' },
  { id: 73, label: 'Heritage III Bench' },
  { id: 74, label: 'Laksha Picnic Table' },
  { id: 78, label: 'Oris III' },
  { id: 79, label: 'Banga I' },
  { id: 80, label: 'Preacast Bench' },
];

quantityDiscountProducts.forEach(halveProductPrice);

if (quantityDiscountProducts.length !== 45) {
  throw new Error(`Expected 45 quantity-discounted products, found ${quantityDiscountProducts.length}.`);
}

const productTitleUpdates = [
  { id: 30, oldTitle: 'Sulo 120 Ltr with pedal', newTitle: '120 Ltr without pedal (Bluestream)' },
  { id: 31, oldTitle: 'Sulo 120 Ltr Without pedal', newTitle: '120 Ltr Without pedal (Bluestream)' },
  { id: 32, oldTitle: 'Sulo 240 Ltr with pedal', newTitle: '240 Ltr without pedal (Bluestream)' },
  { id: 34, oldTitle: 'Sulo 360 Ltr', newTitle: '360 Ltr (Bluestream)' },
  { id: 38, oldTitle: 'Sulo 660 Ltr Bin with Flat Lid and Wheel', newTitle: '660 Ltr Bin with Flat Lid and Wheel (Bluestream)' },
  { id: 39, oldTitle: 'Sulo 1.1 CBM Dome Lid', newTitle: '1.1 CBM Dome Lid (Bluestream)' },
];

for (const item of productTitleUpdates) {
  replaceProductField({
    id: item.id,
    label: item.oldTitle,
    expectedText: `name:${eq}${item.oldTitle}${eq}`,
    field: 'name',
    value: item.newTitle,
  });
}

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

const firstProductEntry = getProductEntry(1, 'Recycling SS 24L 3-in-1')?.entry || '';
if (!firstProductEntry.includes('unitPrice:108')) {
  throw new Error('50% quantity discount check failed for Recycling SS 24L 3-in-1.');
}

const ballerinaEntry = getProductEntry(5, 'Ballerina Bin — 60 Ltr')?.entry || '';
if (!ballerinaEntry.includes('unitPrice:462')) {
  throw new Error('Out-of-stock price preservation failed for Ballerina Bin — 60 Ltr.');
}

const swingTopMiniEntry = getProductEntry(14, 'SS Swing Top Mini — 6 Ltr')?.entry || '';
if (!swingTopMiniEntry.includes('unitPrice:53.5')) {
  throw new Error('Fractional quantity discount failed for SS Swing Top Mini — 6 Ltr.');
}

const rectanglePedalEntry = getProductEntry(25, 'SS Rectangle Pedal Bin')?.entry || '';
if (!rectanglePedalEntry.includes('unitPrice:66') || !rectanglePedalEntry.includes(`${eq}6 Ltr${eq}:66`)) {
  throw new Error('20% capacity price increase check failed for SS Rectangle Pedal Bin.');
}

const jaipurEntry = getProductEntry(62, 'Jaipur II')?.entry || '';
if (!jaipurEntry.includes('unitPrice:2376')) {
  throw new Error('Out-of-stock price preservation failed for Jaipur II.');
}

const nemoIndoorEntry = getProductEntry(58, 'Nemo Indoor')?.entry || '';
if (!nemoIndoorEntry.includes('unitPrice:356.5')) {
  throw new Error('50% quantity discount failed for Nemo Indoor.');
}
for (const [color, quantity] of Object.entries(nemoIndoorColorStock)) {
  if (!nemoIndoorEntry.includes(`${encodeProductString(color)}:${quantity}`)) {
    throw new Error(`Color inventory update failed for Nemo Indoor ${color}.`);
  }
}

const preacastEntry = getProductEntry(80, 'Preacast Bench')?.entry || '';
if (!preacastEntry.includes('unitPrice:1320')) {
  throw new Error('50% quantity discount failed for Preacast Bench.');
}

for (const item of inventoryUpdates) {
  const entry = getProductEntry(item.id, item.label)?.entry || '';
  if (!entry.includes(`stockQty:${item.stockQty}`)) {
    throw new Error(`Inventory update failed for ${item.label}.`);
  }
}

for (const item of productTitleUpdates) {
  const entry = getProductEntry(item.id, item.newTitle)?.entry || '';
  if (!entry.includes(`name:${eq}${item.newTitle}${eq}`) || entry.includes(`name:${eq}${item.oldTitle}${eq}`)) {
    throw new Error(`Product title update failed for ${item.oldTitle}.`);
  }
}

const forbiddenText = [
  'inStockOnly',
  'In Stock Only',
  'stockQty &&',
  '>Availability<',
  'Clinical Waste Bin',
  'Clinical Bin Stainless Steel',
  'BIN SS 29L 250MM DIA 650MM HIGHT WITH PEDAL',
  'BIN SS 5L WITH PEDAL',
  'BIN 56L 300MM DIA 785MM HIGHT',
  'Sulo 240 Ltr Without pedal',
  'Plastic Gogic Bin 120 Ltr with pedal',
  'Plastic Gogic Bin 120 Ltr without pedal',
];

for (const forbidden of forbiddenText) {
  if (html.includes(forbidden)) {
    throw new Error(`Catalogue cleanup failed; still found ${forbidden}.`);
  }
}

// Append separately approved products after the legacy pricing adjustments.
// Their selling prices are final AED values and must not be discounted again.
const additions = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog-additions.json'), 'utf8'));
const templatePattern = /(<script type="__bundler\/template">\s*)([\s\S]*?)(\s*<\/script>)/;
const templateMatch = html.match(templatePattern);
if (!templateMatch) throw new Error('Missing catalogue template.');
let template = JSON.parse(templateMatch[2]);
const productArrayStart = template.indexOf('const ALL_PRODUCTS = [');
const productArrayEnd = template.indexOf('];', productArrayStart);
if (productArrayStart < 0 || productArrayEnd < 0) throw new Error('Missing product array.');
const existingArray = template.slice(productArrayStart, productArrayEnd);
const existingIds = new Set([...existingArray.matchAll(/\{\s*id\s*:\s*(\d+)/g)].map(match => Number(match[1])));
const newIds = new Set();
for (const product of additions) {
  if (!Number.isInteger(product.id) || existingIds.has(product.id) || newIds.has(product.id)) {
    throw new Error(`Duplicate or invalid new product ID: ${product.id}`);
  }
  if (!product.name || !Number.isInteger(product.stockQty) || product.stockQty < 0 || !Number.isFinite(product.unitPrice) || product.unitPrice < 0) {
    throw new Error(`Invalid new product data: ${product.name}`);
  }
  if (!/^\/products\/[a-z0-9-]+\.(jpeg|png)$/.test(product.imageUrl)) {
    throw new Error(`Invalid new product image path: ${product.name}`);
  }
  const filename = path.basename(product.imageUrl);
  const imageSource = path.join(__dirname, 'catalog-assets', filename);
  if (!fs.existsSync(imageSource)) throw new Error(`Missing new product photo: ${filename}`);
  const imageTarget = path.join(__dirname, 'public', 'products', filename);
  fs.mkdirSync(path.dirname(imageTarget), { recursive: true });
  fs.copyFileSync(imageSource, imageTarget);
  newIds.add(product.id);
}
const appendedProducts = additions.map(product => `  ${JSON.stringify(product)},`).join('\n') + '\n';
template = template.slice(0, productArrayEnd) + appendedProducts + template.slice(productArrayEnd);
html = html.replace(templatePattern, (_match, prefix, _payload, suffix) => prefix + JSON.stringify(template).replace(/<\//g, '<\\/') + suffix);
console.log(`Added ${additions.length} separate products. Existing ${existingIds.size} products retained.`);
fs.writeFileSync(indexPath, html);
