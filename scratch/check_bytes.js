import fs from 'fs';

const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc';
if (fs.existsSync(filePath)) {
  const buffer = fs.readFileSync(filePath);
  const hex = buffer.slice(0, 16).toString('hex');
  console.log(`Hex signature of .doc file:`, hex);
  
  // Let's also check if there are other files in the workspace with 'Ban tu kiem diem' or 'Mau 10'
  console.log("\nSearching for other copies of Mau 10 or Ban tu kiem diem in other folders:");
} else {
  console.log("File not found!");
}
