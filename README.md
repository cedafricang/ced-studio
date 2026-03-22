# CED Africa — AV Design Studio

## Your Deployment Folder

This folder contains 4 files. Put all 4 in a GitHub repository:

| File | Purpose |
|---|---|
| `ced_studio_platform.js` | The app (update this when Claude gives you a new version) |
| `index.html` | HTML shell — loads React, Babel, Recharts, mounts the app |
| `build.sh` | Build script — injects your Supabase credentials at deploy time |
| `netlify.toml` | Netlify configuration |

## First-Time Setup

1. Create a GitHub repository (private recommended)
2. Add all 4 files
3. Connect the repo to Netlify
4. Add environment variables in Netlify:
   - `SUPABASE_URL` → your Supabase project URL
   - `SUPABASE_KEY` → your Supabase anon/public key
5. Deploy

## Updating the App

When Claude produces a new version of the platform:

1. Download the new `ced_studio_platform.js`
2. Replace the file in your GitHub repo (drag and drop in GitHub UI)
3. Netlify auto-deploys within 60 seconds
4. Designers refresh their browser — done

## Dev vs Production

| Environment | Storage | How to identify |
|---|---|---|
| Claude artifact | window.storage (local) | No badge in nav |
| Netlify (hosted) | Supabase (cloud, shared) | ☁ LIVE badge in nav |

## First Login

Email: `lead@cedafrica.com`  
Password: `CED@2025`

Change the password immediately via Admin → User Accounts after first login.
