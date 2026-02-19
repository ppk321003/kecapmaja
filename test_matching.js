// Quick test of normalization logic

function normalizeForMatching(value) {
  if (!value) return '';
  
  const str = String(value).toLowerCase().trim();
  
  // Normalize sub_komponen to 3 digits (pad with zeros)
  if (/^\d+$/.test(str)) {
    return str.padStart(3, '0');
  }
  
  // Handle format like "51.0A" - extract just digits and normalize
  const digitMatch = str.match(/^(\d+)/);
  if (digitMatch) {
    const numPart = digitMatch[1].padStart(3, '0');
    const suffix = str.substring(digitMatch[1].length);
    // Keep suffix like _.GG but remove .0A type suffixes for matching
    if (suffix.startsWith('_')) {
      return numPart + suffix;
    }
    return numPart; // Ignore .0A suffix for matching purposes
  }
  
  // Strip kode prefix like "000081. " or "81. "
  const withoutPrefix = str.replace(/^\d+\.\s*/, '');
  
  return withoutPrefix;
}

// Test cases
const tests = [
  ['2', '002'],           // Simple digit
  ['001', '001'],         // Already normalized
  ['51.0A', '051'],       // With suffix (ignore for matching)
  ['051_GG', '051_gg'],   // With program suffix (keep)
  ['1', '001'],           // Single digit
  ['052', '052'],         // Triple digit
];

console.log('Testing normalizeForMatching:\n');
tests.forEach(([input, expected]) => {
  const result = normalizeForMatching(input);
  const status = result === expected ? '✓' : '✗';
  console.log(`${status} "${input}" → "${result}" ${result === expected ? '' : `(expected "${expected}")`}`);
});

// Test matching keys
console.log('\n\nTesting matching key creation:\n');

function createUniqueKey(item) {
  const subKompValue = item.subKomponen || item.sub_komponen || '';
  
  const parts = [
    item.program || item.program_pembebanan || '',
    item.kegiatan || '',
    item.rincianOutput || item.rincian_output || '',
    item.komponenOutput || item.komponen_output || '',
    normalizeForMatching(subKompValue),
    item.akun || '',
    item.uraian || '',
  ];
  
  return parts
    .map(s => String(s || '').toLowerCase().trim())
    .join('|');
}

// Test scenario: Same item with different sub_komponen formats
const item1 = {
  program_pembebanan: '054.01.GG',
  kegiatan: '2897',
  rincian_output: '2897.BMA',
  komponen_output: '2897.BMA.004',  
  sub_komponen: '2',         // OLD format (single digit)
  akun: '524113',
  uraian: 'honor pengajar'
};

const item2 = { 
  ...item1,
  sub_komponen: '001'        // NEW format (normalized)
};

const item3 = {
  ...item1,
  sub_komponen: '51.0A'      // OLD format with suffix
};

const key1 = createUniqueKey(item1);
const key2 = createUniqueKey(item2);
const key3 = createUniqueKey(item3);

console.log('Item with sub_komponen="2":', key1);
console.log('Item with sub_komponen="001":', key2);
console.log('Item with sub_komponen="51.0A":', key3);

// What we really need to test: if a sheet has "2" and CSV has "001"
const sheetItem = { ...item1, sub_komponen: '2' };
const csvItem = { ...item1, sub_komponen: '001' };

const sheetKey = createUniqueKey(sheetItem);
const csvKey = createUniqueKey(csvItem);

console.log('\n--- Critical Test ---');
console.log('Sheet item (sub_komponen="2"):', sheetKey);
console.log('CSV item (sub_komponen="001"):', csvKey);
console.log(`\n✓ Items MATCH after normalization!` if (sheetKey === csvKey) else `✗ Items don't match`);
