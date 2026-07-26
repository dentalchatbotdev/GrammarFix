import { writeFileSync } from 'fs';

function createLogo(size, bg, textColor, accent) {
  const half = size / 2;
  // Shield shape with checkmark — grammar/proofreading theme
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<defs>' +
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="' + bg + '"/>' +
    '<stop offset="100%" stop-color="' + accent + '"/>' +
    '</linearGradient>' +
    '</defs>' +
    // Rounded square
    '<rect width="' + size + '" height="' + size + '" rx="' + (size * 0.18) + '" fill="url(#g)"/>' +
    // Checkmark (grammar approved)
    '<path d="M' + (size * 0.28) + ' ' + half + ' L' + (size * 0.44) + ' ' + (size * 0.62) + ' L' + (size * 0.72) + ' ' + (size * 0.38) + '" ' +
    'stroke="' + textColor + '" stroke-width="' + (size * 0.06) + '" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    // Sparkle dot
    '<circle cx="' + (size * 0.78) + '" cy="' + (size * 0.22) + '" r="' + (size * 0.04) + '" fill="' + textColor + '" opacity="0.7"/>' +
    '</svg>';
  return svg;
}

writeFileSync('images/icon-192.svg', createLogo(192, '#0056b3', '#ffffff', '#4d94ff'));
writeFileSync('images/icon-512.svg', createLogo(512, '#0056b3', '#ffffff', '#4d94ff'));
writeFileSync('images/avatar.svg', createLogo(400, '#0056b3', '#ffffff', '#4d94ff'));

console.log('New logos created!');
