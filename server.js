/**
 * Dangcagan NHS Digital Herbarium
 * A QR Code-Enhanced Herbal Plant Collection
 *
 * Server: Express + EJS templating
 * Database: JSON file (data/plants.json) — easy to add more plants
 *
 * Routes:
 *   GET  /                  Landing page (hero + intro)
 *   GET  /home              Browse all plants + search bar
 *   GET  /about             About the herbarium
 *   GET  /plant/:slug       Plant detail page (used by QR codes)
 *   GET  /search            Search results (q=...)
 *   GET  /qrcodes           QR code index for printing
 *   GET  /api/plants        JSON API of all plants
 *   GET  /api/search?q=     JSON API for fuzzy search
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── View engine ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load plants JSON once and cache it; reload on each request in dev mode
function loadPlants() {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'plants.json'), 'utf-8');
  return JSON.parse(raw);
}

// Inject BASE_URL into every view (used for QR code URLs and canonical links)
app.use((req, res, next) => {
  res.locals.BASE_URL = BASE_URL;
  res.locals.currentPath = req.path;
  next();
});

// ─── Routes ───────────────────────────────────────────────────

// Landing page
app.get('/', (req, res) => {
  const data = loadPlants();
  // Featured plants: pick first 3 for landing showcase
  const featured = data.plants.slice(0, 3);
  res.render('landing', {
    title: 'Dangcagan NHS Digital Herbarium',
    plants: data.plants,
    featured,
    totalPlants: data.plants.length
  });
});

// Home — browse + search
app.get('/home', (req, res) => {
  const data = loadPlants();
  const { category, tag } = req.query;
  let plants = data.plants;

  if (category && category !== 'all') {
    plants = plants.filter(p =>
      (p.category || '').toLowerCase() === category.toLowerCase()
    );
  }
  if (tag) {
    plants = plants.filter(p => (p.tags || []).includes(tag));
  }

  const categories = [...new Set(data.plants.map(p => p.category).filter(Boolean))];

  res.render('home', {
    title: 'Browse Plants — Dangcagan NHS Herbarium',
    plants,
    categories,
    activeCategory: category || 'all',
    totalPlants: data.plants.length
  });
});

// About page
app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About — Dangcagan NHS Herbarium'
  });
});

// Plant detail page — this is the QR-code target
app.get('/plant/:slug', (req, res) => {
  const data = loadPlants();
  const plant = data.plants.find(p => p.slug === req.params.slug);

  if (!plant) {
    return res.status(404).render('404', {
      title: 'Plant Not Found',
      message: `Sorry, we couldn't find a plant with the name "${req.params.slug}".`
    });
  }

  // Find related plants (same family or category, excluding current)
  const related = data.plants
    .filter(p =>
      p.slug !== plant.slug &&
      (p.family === plant.family || p.category === plant.category)
    )
    .slice(0, 3);

  // Find next/prev for navigation
  const currentIndex = data.plants.findIndex(p => p.slug === plant.slug);
  const prevPlant = currentIndex > 0 ? data.plants[currentIndex - 1] : null;
  const nextPlant = currentIndex < data.plants.length - 1 ? data.plants[currentIndex + 1] : null;

  // Generate QR target URL
  const qrUrl = `${BASE_URL}/plant/${plant.slug}`;

  res.render('plant', {
    title: `${plant.name} — Dangcagan NHS Herbarium`,
    plant,
    related,
    prevPlant,
    nextPlant,
    qrUrl
  });
});

// Search results page
app.get('/search', (req, res) => {
  const data = loadPlants();
  const q = (req.query.q || '').trim();
  res.render('search', {
    title: `Search${q ? `: ${q}` : ''} — Dangcagan NHS Herbarium`,
    plants: data.plants,
    query: q
  });
});

// QR codes index — print-friendly page with QR code for every plant
app.get('/qrcodes', (req, res) => {
  const data = loadPlants();
  const plantsWithQr = data.plants.map(p => ({
    ...p,
    qrUrl: `${BASE_URL}/plant/${p.slug}`
  }));
  res.render('qrcodes', {
    title: 'QR Code Index — Dangcagan NHS Herbarium',
    plants: plantsWithQr
  });
});

// ─── JSON API (used by the in-page fuzzy search) ─────────────
app.get('/api/plants', (req, res) => {
  const data = loadPlants();
  res.json({
    success: true,
    count: data.plants.length,
    plants: data.plants
  });
});

app.get('/api/search', (req, res) => {
  const data = loadPlants();
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json({ success: true, query: q, results: [] });
  }
  // Lightweight server-side search ( Fuse.js is used client-side for fuzzy )
  const results = data.plants.filter(p => {
    const haystack = [
      p.name, p.scientificName, p.family, p.category,
      ...(p.otherNames || []), ...(p.tags || []),
      p.description, ...(p.medicinalUses || [])
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  res.json({ success: true, query: q, count: results.length, results });
});

// ─── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    message: `Sorry, the page "${req.path}" doesn't exist on this herbarium.`
  });
});

// ─── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Dangcagan NHS Digital Herbarium');
  console.log('  A QR Code-Enhanced Herbal Plant Collection');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Server running at: ${BASE_URL}`);
  console.log(`  Plant database:   /data/plants.json`);
  console.log(`  QR target route:  /plant/:slug`);
  console.log('═══════════════════════════════════════════════════');
});
