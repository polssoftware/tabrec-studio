# Publish Tabrec Studio

Project identity: https://github.com/polssoftware

## 1. Upload to GitHub

1. Extract this ZIP.
2. Create a repository under the polssoftware GitHub account, or open your existing Tabrec Studio repository.
3. Upload the extracted contents into the repository root. `package.json`, `index.html`, `src/` and `vite.config.js` must be at the top level. Upload the files and folders, not the ZIP itself or an extra outer folder.
4. Include the dotfiles `.gitignore` and `.node-version` if using GitHub's browser upload. Commit to `main`.

`dist/` already contains a compiled static site. `src/` contains the editable application. Cloudflare rebuilds `dist/` from source when connected to GitHub.

## 2. Connect Cloudflare Pages

1. Open Cloudflare > Workers & Pages > Create application.
2. Choose **Pages**, then **Import an existing Git repository** (or **Connect to Git**).
3. Authorize GitHub and select the repository under polssoftware.
4. Enter these build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | `React (Vite)` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave blank |
| Node.js | `24` (provided by `.node-version`) |

If the React (Vite) preset is absent, choose None and enter the build command and output directory above manually. Cloudflare installs the locked npm dependencies automatically. No deploy command, API key, environment secrets, database or Node server is required.

5. Select **Save and Deploy**. Open the HTTPS `pages.dev` URL Cloudflare provides.
6. Allow microphone access when you choose to record or enable input metering. Select Play once to let the browser start audio.

Cloudflare Pages rebuilds and publishes after subsequent commits. Do not run `npm start` as the Cloudflare build command; it is only a local preview server. Do not set the output directory to `src`, the repository root or `public`.

## Alternative: upload the compiled site directly

For an immediate static deployment, use Cloudflare Pages Direct Upload and upload the contents of `dist/`. The uploaded root must contain the compiled `index.html` and `assets/`. Use the Git connection above when you want updates to deploy from GitHub automatically.

## Local preview

With Node.js installed:

```
npm ci
npm run build
npm start
```

The supplied Windows launcher also opens the compiled site locally. Do not double-click `index.html` to run it through a file URL: browser audio workers and recording need HTTP on localhost or HTTPS when hosted.

## Publication contents and privacy

This release contains the runnable DAW, its source, tests, dependency lock, compiled assets and required dependency notices. It excludes local checks, transfer metadata, editor settings, installed dependencies, source archives for unused plugins, audio recordings, saved projects and Git history. The app starts with an empty project. Source maps are not shipped.

Only polssoftware identifies this project. Third-party license holders and package registry URLs are dependency metadata, not the project owner's identity; required notices are retained. Publishing the site does not upload visitors' recordings or saved project files to a server. GitHub and Cloudflare account/profile information is controlled separately in those services.
