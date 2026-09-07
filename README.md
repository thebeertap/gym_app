# Iron Log — workout tracker

A small installable web app (PWA) for tracking gym workouts: templates, sets, reps, and weight, stored only on your phone, with CSV export.

## What it does

- **Templates**: create a reusable workout (e.g. "Push Day") with exercises, a set count, target reps, and a starting weight for each.
- **Sessions**: start a template, tap into each exercise, tick off reps as you complete them, and adjust the weight per set with +/− steppers or by typing it in.
- **History**: every finished workout is saved locally with its date. Tap into any past workout to see exactly what you did.
- **Export**: from Settings, "Export history as CSV" opens your phone's share sheet so you can send the file straight to an email app (or Drive, Files, etc.) as a real attachment.
- **Offline**: once installed, it works with no internet connection. Data lives in the browser's local storage on your phone, tied to wherever you host it — nothing is uploaded anywhere.

## Step 1 — Put the files somewhere reachable by your phone

A PWA needs to be loaded from a URL (not just opened as a bare file) for "Add to Home Screen" and offline caching to work properly. Pick whichever is easiest for you — no coding needed for any of these:

**Easiest — Netlify Drop (free, no account required)**
1. On a computer, go to https://app.netlify.com/drop
2. Drag the whole `gym-tracker` folder onto the page.
3. You'll get a URL like `https://random-name-123.netlify.app`. Open that URL on your Android phone in Chrome.

**Alternative — GitHub Pages (free, needs a GitHub account)**
1. Create a new GitHub repository and upload the contents of the `gym-tracker` folder.
2. In the repo's Settings → Pages, enable Pages for the main branch.
3. Open the resulting `https://<username>.github.io/<repo>` URL on your phone.

**Alternative — host it yourself on your home network**
If you'd rather not use a third-party host, you can run a tiny local server on any always-on computer on your Wi-Fi (e.g. `python3 -m http.server 8080` from inside the folder) and open `http://<that-computer's-IP>:8080` on your phone. This only works while that computer is on and your phone is on the same network, and it won't have a proper HTTPS certificate, so some Android versions may block full "Install app" behavior — Netlify or GitHub Pages is more reliable long-term.

## Step 2 — Install it on your phone

1. Open the hosted URL in **Chrome** on your Android phone.
2. Tap the **⋮** menu (top right) → **Add to Home screen** (Chrome may also show an **Install app** banner automatically — either works).
3. Confirm. An "Iron Log" icon appears on your home screen and launches full-screen, like a normal app.

## Notes

- If you ever reinstall from a *different* URL, that counts as a different app to your phone's browser and your saved data won't carry over — pick one hosting location and stick with it.
- "Clear all data" in Settings wipes everything on this device; there's no cloud backup, so use CSV export if you want a copy elsewhere.
- The share-sheet export needs a browser that supports the Web Share API with files (recent Chrome on Android does). If for any reason it's unavailable, it automatically falls back to downloading the CSV file to your phone instead, which you can then attach to an email manually.
