const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const { execSync } = require('child_process');

const baseName = 'hacklink-xd';
const randomId = Math.floor(Math.random() * 10000);
const serviceName = `${baseName}-${randomId}`;
const deployDir = path.join(__dirname, 'deploys', serviceName);

// Step 1: Copy template to new deploy folder
fs.mkdirSync(deployDir, { recursive: true });
execSync(`cp -r template/* ${deployDir}`);

// Step 2: Replace service name in files
['render.yaml', 'package.json'].forEach((file) => {
  const filePath = path.join(deployDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/SERVICE_NAME_PLACEHOLDER/g, serviceName);
  fs.writeFileSync(filePath, content);
});

// Step 3: Deploy via Render API
(async () => {
  const RENDER_API = 'https://api.render.com/v1';
  const { RENDER_API_KEY, RENDER_TEAM_ID } = process.env;

  if (!RENDER_API_KEY || !RENDER_TEAM_ID) {
    console.error('❌ Missing API credentials in .env');
    process.exit(1);
  }

  try {
    // Zip the deploy folder
    const zipFile = `${deployDir}.zip`;
    execSync(`cd deploys && zip -r ${serviceName}.zip ${serviceName}`);

    // Upload using the Render API
    const { data: upload } = await axios.post(
      `${RENDER_API}/services`,
      {
        name: serviceName,
        repo: {
          type: "tar",
          tarballUrl: `https://fake-url/${serviceName}.zip` // This needs a real upload or Git repo
        },
        env: "node",
        buildCommand: "npm install",
        startCommand: "npm start",
        plan: "free",
        type: "web",
        teamId: RENDER_TEAM_ID
      },
      {
        headers: {
          Authorization: `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Deployed as: ${upload.service.name}`);
  } catch (err) {
    console.error('❌ Deployment failed:', err.response?.data || err.message);
  }
})();
