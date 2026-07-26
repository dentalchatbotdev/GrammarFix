import { writeFileSync } from 'fs';

const sizes = [192, 512];
const bg = '#0056b3';

for (const size of sizes) {
  const half = size / 2;
  const fontSize = size * 0.4;
  const y = size * 0.62;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<rect width="' + size + '" height="' + size + '" fill="' + bg + '"/>' +
    '<text x="' + half + '" y="' + y + '" font-size="' + fontSize + '" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">GF</text>' +
    '</svg>';
  writeFileSync('images/icon-' + size + '.svg', svg);
}
console.log('Icons generated');
