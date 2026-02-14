const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  const sizes = [16, 32, 48, 128];
  const svgPath = path.join(__dirname, 'icons', 'icon.svg');
  
  console.log('Converting SVG to PNG...');
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created icons/icon${size}.png (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Error creating ${outputPath}:`, error.message);
    }
  }
  
  console.log('\nConversion complete!');
}

convertSvgToPng().catch(console.error);