import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const TARGET_DIR = path.resolve(__dirname, '../public/models');

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const downloadFile = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(TARGET_DIR, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(MODELS_URL + filename, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded: ${filename}`);
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
         // Follow redirect
         https.get(response.headers.location, (redirResponse) => {
            redirResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`Downloaded: ${filename}`);
              resolve();
            });
         }).on('error', (err) => {
           fs.unlinkSync(filePath);
           reject(err);
         });
      } else {
        fs.unlinkSync(filePath);
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlinkSync(filePath);
      reject(err);
    });
  });
};

async function run() {
  console.log('Downloading models to', TARGET_DIR);
  for (const model of models) {
    try {
      await downloadFile(model);
    } catch (e) {
      console.error(e);
    }
  }
  console.log('Done!');
}

run();
