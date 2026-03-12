#!/bin/bash
set -e
V5="Prospektus-generator/Version 5/kapitalplattformen-v5"
cd "$V5/frontend"
npm install
npm run build
cd "../backend"
npm install
