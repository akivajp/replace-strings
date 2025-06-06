const sharp = require('sharp');
const fs = require('fs');

const sizes = [16, 48, 128];

async function convertIcons() {
  const svgBuffer = fs.readFileSync('icon.svg');
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(`images/icon${size}.png`);
    console.log(`Created icon${size}.png`);
  }
}

convertIcons().catch(console.error); 