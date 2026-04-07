require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateStructuredData } = require('./lib/gemini.cjs');
const { computeValuation } = require('./lib/valuation-engine.cjs');

const app = express();
const port = process.env.PORT || 3001;

let connectPromise = null;

async function ensureDatabase() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }

  if (!connectPromise) {
    const mongoUri = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('Missing MONGODB_URI or MONGODB_URI_DIRECT');
    }

    connectPromise = mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB || 'Titiksha-builtattic'
    })
      .then(() => {
        console.log('MongoDB Connected');
        return mongoose.connection.db;
      })
      .catch((err) => {
        connectPromise = null;
        console.error('MongoDB Connection Error:', err);
        if (err?.syscall === 'querySrv' && !process.env.MONGODB_URI_DIRECT) {
          console.error('MongoDB SRV lookup failed. Set MONGODB_URI_DIRECT to a non-SRV Atlas connection string to bypass DNS SRV resolution.');
        }
        throw err;
      });
  }

  return connectPromise;
}

// Raw DB accessor
const db = () => mongoose.connection.db;

// Middleware
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => {
  try {
    await ensureDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
};

// ─── Auth Endpoints (using existing users collection) ─────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await db().collection('users').findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name || 'Builder',
      role: 'user',
      isVerified: true,
      isActive: true,
      preferences: { notifications: true, emailUpdates: true, theme: 'system' },
      subscription: { plan: 'free', status: 'active', startDate: new Date(), endDate: null },
      refreshTokens: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('users').insertOne(user);
    const token = jwt.sign({ userId: result.insertedId.toString(), role: 'user' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({
      token,
      user: { id: result.insertedId, name: user.name, email: user.email, role: user.role, plan: user.subscription.plan }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db().collection('users').findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update lastLogin
    await db().collection('users').updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.publicAvatar || user.avatar || null,
        plan: user.subscription?.plan || 'free',
        specializations: user.specializations || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await db().collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(req.user.userId) },
      { projection: { password: 0, refreshTokens: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.publicAvatar || user.avatar || null,
      phone: user.phone,
      plan: user.subscription?.plan || 'free',
      specializations: user.specializations || [],
      bio: user.associateProfile?.bio || '',
      company: user.company,
      rating: user.rating,
      portfolioCount: user.associateProfile?.portfolio?.length || 0,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── Platform Stats ───────────────────────────────────────────────────────────

app.get('/api/stats', async (req, res) => {
  try {
    const [totalUsers, totalDesigns, totalOrders, totalUsages, totalMedia, totalChats] = await Promise.all([
      db().collection('users').countDocuments(),
      db().collection('designs').countDocuments({ status: 'published' }),
      db().collection('orders').countDocuments(),
      db().collection('usages').countDocuments(),
      db().collection('media').countDocuments(),
      db().collection('chatsessions').countDocuments()
    ]);

    const roleBreakdown = await db().collection('users').aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).toArray();

    const roles = {};
    roleBreakdown.forEach(r => { roles[r._id] = r.count; });

    res.json({
      totalUsers,
      totalDesigns,
      totalOrders,
      totalUsages,
      totalMedia,
      totalChats,
      associates: roles.associate || 0,
      buyers: roles.buyer || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Designs (public gallery from existing designs collection) ────────────────

app.get('/api/designs', async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    const filter = { status: 'published' };
    if (category && category !== 'All') filter.category = category;

    const designs = await db().collection('designs').find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .toArray();

    // Enrich with user info
    const userIds = [...new Set(designs.map(d => d.userId))];
    const users = await db().collection('users').find(
      { _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { projection: { name: 1, avatar: 1, publicAvatar: 1, role: 1 } }
    ).toArray();

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = designs.map(d => ({
      _id: d._id,
      title: d.title,
      description: d.description?.substring(0, 200),
      category: d.category,
      style: d.style,
      climate: d.climate,
      thumbnail: d.publicThumbnail || d.thumbnail,
      images: d.publicImages || d.images,
      specifications: d.specifications,
      priceSqft: d.priceSqft,
      totalPrice: d.totalPrice,
      deliveryTime: d.deliveryTime,
      views: d.views || 0,
      saves: d.saves || 0,
      createdAt: d.createdAt,
      creator: userMap[d.userId] ? {
        name: userMap[d.userId].name,
        avatar: userMap[d.userId].publicAvatar || userMap[d.userId].avatar,
        role: userMap[d.userId].role
      } : null
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Designs error:', error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// Single design detail
app.get('/api/designs/:id', async (req, res) => {
  try {
    const design = await db().collection('designs').findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!design) return res.status(404).json({ error: 'Design not found' });

    const creator = await db().collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(design.userId) },
      { projection: { name: 1, avatar: 1, publicAvatar: 1, role: 1, specializations: 1, 'associateProfile.bio': 1 } }
    );

    // Use public URLs
    design.thumbnail = design.publicThumbnail || design.thumbnail;
    design.images = design.publicImages || design.images;
    if (creator) creator.avatar = creator.publicAvatar || creator.avatar;

    res.json({ ...design, creator });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

// ─── Associates (architects/professionals) ────────────────────────────────────

app.get('/api/associates', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const associates = await db().collection('users').find(
      { role: 'associate', isActive: true },
      {
        projection: {
          password: 0, refreshTokens: 0,
          'associateProfile.portfolio.images': 0,
          'associateProfile.availability': 0,
          'associateProfile.consulting': 0
        }
      }
    ).sort({ createdAt: -1 }).limit(Number(limit)).toArray();

    const enriched = associates.map(a => ({
      _id: a._id,
      name: a.name,
      avatar: a.publicAvatar || a.avatar,
      specializations: a.specializations || [],
      rating: a.rating,
      bio: a.associateProfile?.bio?.split('\n')[0] || '',
      plan: a.subscription?.plan || 'free',
      portfolioCount: a.associateProfile?.portfolio?.length || 0,
      bundleCount: a.associateProfile?.bundles?.length || 0,
      totalViews: a.associateAnalytics?.totalViews || 0,
      createdAt: a.createdAt
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch associates' });
  }
});

// ─── User's own designs ───────────────────────────────────────────────────────

app.get('/api/my/designs', authenticateToken, async (req, res) => {
  try {
    const designs = await db().collection('designs').find({ userId: req.user.userId })
      .sort({ createdAt: -1 }).toArray();
    const enriched = designs.map(d => ({
      ...d,
      thumbnail: d.publicThumbnail || d.thumbnail,
      images: d.publicImages || d.images
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// ─── User's orders ────────────────────────────────────────────────────────────

app.get('/api/my/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db().collection('orders').find({
      $or: [
        { buyerId: req.user.userId },
        { associateId: req.user.userId }
      ]
    }).sort({ createdAt: -1 }).toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── User's generations (AI analyses) ─────────────────────────────────────────

app.get('/api/my/generations', authenticateToken, async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    const filter = { userId: new mongoose.Types.ObjectId(req.user.userId) };
    if (type) filter.type = type;

    const generations = await db().collection('generations').find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .toArray();

    res.json(generations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generations' });
  }
});

// ─── Multer setup ─────────────────────────────────────────────────────────────

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.memoryStorage()
});

// ─── Site Analyzer ────────────────────────────────────────────────────────────

app.post('/api/analyze', optionalAuth, upload.single('image'), async (req, res) => {
  try {
    const { location, projectType, scale, note } = req.body;
    const image = req.file;
    if (!image) return res.status(400).json({ error: 'Image required' });

    const basePrompt = `
      Analyze this construction site photo and produce a strict, engineering-grade JSON output.
      Determine if the project is "under_construction" or "completed".
      Output ONLY valid JSON matching this schema:
      {
        "project_status": "under_construction" | "completed",
        "stage_of_construction": "Planning" | "Foundation" | "Structure" | "Services" | "Finishing" | "Completed",
        "progress_percent": number (0-100),
        "timeline": { "hours_remaining": number, "manpower_hours": number, "machinery_hours": number },
        "category_matrix": { "Category": string, "Typology": string, "Style": string, "ClimateAdaptability": string, "Terrain": string, "SoilType": string, "MaterialUsed": string, "InteriorLayout": string, "RoofType": string, "Exterior": string, "AdditionalFeatures": string, "Sustainability": string },
        "scope": { "stages_completed": string[], "stages_left": string[], "dependencies": string[] },
        "geo_market_factors": { "terrain": string, "soil_condition": string, "climate_zone": string, "population_density": string, "master_plan_zone": string, "policy_posture": string, "comparable_properties_count": number, "city_growth_5y_percent": number, "property_growth_percent": number, "land_growth_percent": number, "property_age_years": number, "resale_value_percent": number, "investment_roi_percent": number },
        "notes": string[]
      }
      Context: Location: ${location || 'unknown'}, Type: ${projectType || 'unknown'}, Scale: ${scale || 'unknown'}.
      Return JSON only.
    `;

    const baseResult = await generateStructuredData(basePrompt, image.buffer, image.mimetype);

    const valuationInput = {
      projectType: baseResult.category_matrix?.Typology,
      scale: baseResult.category_matrix?.Category,
      status: baseResult.project_status,
      stageLabel: baseResult.stage_of_construction,
      progressValue: baseResult.progress_percent,
      location: location || '',
      geoStatus: 'none',
      categoryRow: baseResult.category_matrix,
      geoFactors: baseResult.geo_market_factors
    };
    const valuationResult = computeValuation(valuationInput);

    const advancedPrompt = `
      As a construction deviation analyst, review this site photo and the previous base analysis.
      Base Analysis: ${JSON.stringify(baseResult)}
      Output ONLY valid JSON:
      { "progress_vs_ideal": "Ahead" | "On Track" | "Delayed", "timeline_drift": string, "cost_risk_signals": string[], "recommendations": string[] }
      Return JSON only.
    `;
    const advancedResult = await generateStructuredData(advancedPrompt, image.buffer, image.mimetype);

    const combined = { base: baseResult, valuation: valuationResult, advanced: advancedResult };

    // Save to generations collection if logged in
    if (req.user) {
      await db().collection('generations').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        type: 'site-analysis',
        title: `Site Analysis - ${location || 'Unknown'}`,
        input: { location, projectType, scale, note },
        result: combined,
        status: 'completed',
        createdAt: new Date()
      });
    }

    res.json({ ...combined, timestamp: new Date() });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze site' });
  }
});

// ─── Masterplan Explorer ──────────────────────────────────────────────────────

app.post('/api/masterplan', optionalAuth, async (req, res) => {
  try {
    const { city, country } = req.body;
    if (!city) return res.status(400).json({ error: 'City required' });

    // Check cache first
    const cached = await db().collection('masterplan_cache').findOne({ city: city.toLowerCase() });
    if (cached && cached.hotspots) {
      return res.json({ city, country: country || 'India', hotspots: cached.hotspots, cached: true });
    }

    const prompt = `
      Identify 4 to 6 high-potential development hotspots in ${city}, ${country || 'India'}.
      Output ONLY valid JSON:
      { "hotspots": [{ "id": string, "name": string, "center": { "lat": number, "lng": number }, "radiusKm": number, "typology": string, "ticketSizeINR": { "min": number, "max": number }, "features": { "policyUplift": number, "transitAccess": number, "publicCapexProximity": number, "demographicGrowth": number }, "reasonNotes": [string] }] }
      Return JSON only.
    `;
    const result = await generateStructuredData(prompt);

    // Cache result
    await db().collection('masterplan_cache').updateOne(
      { city: city.toLowerCase() },
      { $set: { city: city.toLowerCase(), country: country || 'India', hotspots: result.hotspots, updatedAt: new Date() } },
      { upsert: true }
    );

    if (req.user) {
      await db().collection('generations').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        type: 'masterplan',
        title: `Masterplan - ${city}`,
        input: { city, country },
        result: { city, hotspots: result.hotspots },
        status: 'completed',
        createdAt: new Date()
      });
    }

    res.json({ city, country: country || 'India', hotspots: result.hotspots });
  } catch (error) {
    console.error('Masterplan error:', error);
    res.status(500).json({ error: 'Failed to explore masterplan' });
  }
});

// ─── Floor Plan Generator ─────────────────────────────────────────────────────

app.post('/api/floorplan', optionalAuth, async (req, res) => {
  try {
    const { bedrooms, budget, style, area, location } = req.body;
    const prompt = `
      Generate 3 floor plan variants. Requirements: ${bedrooms || 3} bedrooms, budget ${budget || '50-80 Lakhs'}, style: ${style || 'modern'}, area: ${area || '1200 sqft'}, location: ${location || 'India'}.
      Output ONLY valid JSON:
      { "plans": [{ "name": string, "config": string, "totalArea": string, "estimatedCost": string, "rooms": [{ "name": string, "area": string, "description": string }], "features": string[], "vastu_compliant": boolean, "energy_rating": string }] }
      Return JSON only.
    `;
    const result = await generateStructuredData(prompt);

    if (req.user) {
      await db().collection('generations').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        type: 'floor-plan',
        title: `Floor Plan - ${bedrooms || 3}BHK ${style || 'Modern'}`,
        input: { bedrooms, budget, style, area, location },
        result,
        status: 'completed',
        createdAt: new Date()
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Floor plan error:', error);
    res.status(500).json({ error: 'Failed to generate floor plans' });
  }
});

// ─── Material Finder ──────────────────────────────────────────────────────────

app.post('/api/materials', optionalAuth, async (req, res) => {
  try {
    const { query, location, projectType } = req.body;
    const prompt = `
      Construction material search: "${query || 'cement, steel, tiles'}". Location: ${location || 'Mumbai'}, Project: ${projectType || 'Residential'}.
      Output ONLY valid JSON:
      { "materials": [{ "name": string, "category": string, "brand": string, "grade": string, "priceRange": { "min": number, "max": number, "unit": string }, "suppliers": [{ "name": string, "location": string, "rating": number, "deliveryDays": number }], "specifications": string[], "recommended": boolean }] }
      Return JSON only.
    `;
    const result = await generateStructuredData(prompt);

    if (req.user) {
      await db().collection('generations').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        type: 'material-search',
        title: `Materials - ${query || 'General'}`,
        input: { query, location, projectType },
        result,
        status: 'completed',
        createdAt: new Date()
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Materials error:', error);
    res.status(500).json({ error: 'Failed to search materials' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Builtattic backend running on port ${port}`);
  });
}
module.exports = app;
