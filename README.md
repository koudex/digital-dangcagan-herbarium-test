# Dangcagan NHS Digital Herbarium

**A QR Code-Enhanced Herbal Plant Collection**

A digital herbarium for Dangcagan National High School documenting Philippine medicinal plants. Each plant has a unique QR code that links directly to its detail page — scan a physical specimen's QR code in the school garden and instantly access its full botanical record.

---

## Features

- **QR Code-Enhanced** — every plant has a unique URL (`/plant/:slug`) and a printable QR code
- **Fuzzy Search** — Wikipedia-style search with typo tolerance (powered by Fuse.js)
- **Mobile-First** — responsive design that works beautifully on phones, tablets, and desktops
- **JSON Database** — add a new plant by adding one entry to `data/plants.json`
- **Server-Rendered** — pages load instantly, perfect for QR code scanning
- **Light Animations** — smooth scroll reveals, no janky transitions
- **Print-Friendly QR Index** — print all QR codes on one page for labeling specimens

---

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Backend      | Express.js (Node.js)                        |
| Templating   | EJS — server-side rendered                  |
| Database     | JSON file (`data/plants.json`)              |
| Search       | Fuse.js — client-side fuzzy matching        |
| QR Codes     | QRCode.js — generated per plant URL         |
| Styling      | Custom CSS — mobile-first, no framework    |
| Fonts        | Cormorant Garamond + Inter (Google Fonts)   |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher

### Installation

```bash
# 1. Navigate to the project folder
cd dangcagan-herbarium

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

The website will be available at **http://localhost:3000**

For development with auto-restart:

```bash
npm run dev
```

---

## Routes (Endpoints)

| Route              | Description                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `/`                | Landing page — hero, featured plants, how-it-works, search teaser |
| `/home`            | Browse all plants with category filter                            |
| `/about`           | About the project, mission, tech stack                            |
| `/search?q=...`    | Search results page (fuzzy)                                       |
| `/plant/:slug`     | Plant detail page (target for QR codes)                          |
| `/qrcodes`         | Printable QR code index for all plants                            |
| `/api/plants`      | JSON API — all plants                                             |
| `/api/search?q=...`| JSON API — server-side search                                     |

---

## How to Add a New Plant

Adding a plant is as simple as editing one JSON file. **No code changes needed.**

1. Open `data/plants.json`
2. Copy an existing plant object (everything between `{ }` including the trailing comma)
3. Paste it as a new entry in the `plants` array
4. Update the fields:

```json
{
  "slug": "your-plant-name",          // URL-safe, unique, used in /plant/:slug
  "name": "Display Name",              // shown as the page title
  "scientificName": "Latin name",      // italicized on the page
  "family": "Plant Family",            // shown as eyebrow + in quick facts
  "otherNames": ["Alias 1", "Alias 2"],// optional alternative names
  "category": "Medicinal",             // used for filtering on /home
  "tags": ["herb", "respiratory"],     // used for tag links
  "image": "https://.../image.jpg",    // URL to the plant photo
  "shortDescription": "One sentence.",
  "description": "Full paragraph(s)...",
  "medicinalUses": ["Use 1", "Use 2"],
  "preparation": "How to prepare...",
  "habitat": "Where it grows...",
  "cultivation": "How to grow...",
  "precautions": "Safety warnings...",
  "funFact": "Interesting trivia..."
}
```

5. Save the file. The server auto-reloads the JSON on every request — refresh the browser and your new plant appears.

> **Tip:** Use a stable image URL (Wikimedia Commons, your own hosted image). For local images, put the file in `public/images/plants/` and reference it as `/images/plants/your-image.jpg`.

---

## How QR Codes Work

1. Each plant has a unique URL: `https://your-domain.com/plant/lagundi`
2. Visit `/qrcodes` to see and print a QR code for every plant
3. Attach the printed QR code to the physical specimen in the school garden
4. Students/teachers scan with any smartphone camera — the link opens the plant's full record instantly

To download a single plant's QR code: open its detail page (`/plant/...`) and click "Download" in the sidebar.

---

## Project Structure

```
dangcagan-herbarium/
├── server.js                 # Express server + routes
├── package.json              # Dependencies and scripts
├── README.md                 # This file
│
├── data/
│   └── plants.json           # ← THE database. Edit this to add plants.
│
├── views/                    # EJS templates (server-rendered)
│   ├── partials/
│   │   ├── header.ejs        # Site header + nav
│   │   └── footer.ejs        # Site footer + script includes
│   ├── landing.ejs           # /        — landing page
│   ├── home.ejs              # /home    — browse collection
│   ├── about.ejs             # /about   — about the project
│   ├── plant.ejs             # /plant/:slug — plant detail (QR target)
│   ├── search.ejs            # /search  — search results
│   ├── qrcodes.ejs           # /qrcodes — printable QR index
│   └── 404.ejs               # Not found page
│
└── public/                   # Static assets served as-is
    ├── css/
    │   └── style.css         # All styles (mobile-first, botanical theme)
    ├── js/
    │   └── main.js           # Mobile nav, search, QR, scroll reveal
    └── images/
        ├── logo.jpeg         # School logo
        └── plants/           # (optional) local plant images
```

---

## Deployment

This app runs anywhere Node.js runs. Common options:

### Option A: Local / School Network
```bash
npm install && npm start
```
Then share the server's IP + port (e.g. `http://192.168.1.10:3000`) within the school network.

### Option B: Cloud (Render, Railway, Fly.io)
1. Push the project to GitHub
2. Connect the repo to Render / Railway / Fly.io
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Set the `BASE_URL` environment variable to your deployed URL (e.g. `https://dangcagan-herbarium.onrender.com`) — this ensures QR codes point to the correct public URL.

### Option C: VPS / Self-hosted
```bash
# Using PM2 for process management
npm install -g pm2
npm install
pm2 start server.js --name herbarium
pm2 save
pm2 startup  # auto-restart on reboot
```
For HTTPS, place behind Nginx + Let's Encrypt.

---

## Environment Variables

| Variable    | Default                  | Description                          |
| ----------- | ------------------------ | ------------------------------------ |
| `PORT`      | `3000`                   | Port the server listens on           |
| `BASE_URL`  | `http://localhost:3000`  | Public URL — used to generate QR codes |

Example:
```bash
BASE_URL=https://herbarium.dangcagan-nhs.edu.ph PORT=80 npm start
```

---

## Customization

### Change Theme Colors
Edit the CSS variables at the top of `public/css/style.css`:

```css
:root {
  --primary:   #2d5a3d;  /* main green */
  --accent:    #c4956c;  /* warm amber */
  --cream:     #faf8f3;  /* background */
  /* ...etc */
}
```

### Change Fonts
Edit the Google Fonts link in `views/partials/header.ejs` and the `--font-serif` / `--font-sans` variables in CSS.

### Replace the Logo
Replace `public/images/logo.jpeg` with your school's logo (any aspect ratio works — it's displayed as a circle).

---

## Educational Disclaimer

This digital herbarium is intended for **educational and informational purposes only**. The medicinal uses documented here reflect traditional Philippine folk knowledge and are not a substitute for professional medical advice. Always consult a licensed healthcare provider before using any plant medicinally.

---

## License

MIT — free to use, modify, and distribute for educational purposes.

---

## Credits

Built for **Dangcagan National High School** as a school project. Plant data sourced from the Philippine Department of Health's list of ten endorsed medicinal plants. Images sourced from Wikimedia Commons (free media).
