#!/bin/bash
# CED Africa AV Design Studio — Netlify Build Script
# 
# This script:
# 1. Creates the _site output directory
# 2. Injects Supabase credentials into index.html
# 3. Copies the app files to _site for Netlify to serve
#
# Environment variables required (set in Netlify dashboard):
#   SUPABASE_URL  — your Supabase project URL
#   SUPABASE_KEY  — your Supabase anon/public key

set -e  # Exit immediately if any command fails

echo "=== CED Africa Studio — Build Starting ==="

# Create output directory
mkdir -p _site

# Validate environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "ERROR: SUPABASE_URL and SUPABASE_KEY must be set in Netlify environment variables"
  exit 1
fi

echo "✓ Supabase credentials found"

# Inject credentials into index.html
sed "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g; s|%%SUPABASE_KEY%%|${SUPABASE_KEY}|g" \
  index.html > _site/index.html

echo "✓ Credentials injected into index.html"

# Copy the app
cp ced_studio_platform.js _site/ced_studio_platform.js

echo "✓ App file copied"
echo "=== Build Complete — _site/ ready for deployment ==="
