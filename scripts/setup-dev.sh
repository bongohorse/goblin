#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major !== 24 || minor < 21) { console.error("Goblin requires Node >=24.21.0 <25"); process.exit(1); }'
npm ci --no-audit --no-fund
printf '%s\n' 'Goblin ready: npm run dev -> http://localhost:5174/'
