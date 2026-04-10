import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateStructuredData, generateFloorPlanImage } from './lib/gemini.js';
import { computeValuation } from './lib/valuation-engine.js';
import { v2 as cloudinary } from 'cloudinary';

const app = express();
const port = process.env.PORT || 3001;

// ─── Cloudinary setup ─────────────────────────────────────────────────────────
const cloudinaryEnabled = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('Cloudinary: enabled');
} else {
  console.warn('Cloudinary: disabled (missing env vars) — falling back to base64 in MongoDB');
}

function uploadBufferToCloudinary(buffer, { userId, type, label }) {
  return new Promise((resolve, reject) => {
    const folder = `builtattic/${userId || 'anon'}/${type}`;
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', context: label ? { label } : undefined },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function buildDownloadUrl(secureUrl, filename) {
  // Inject fl_attachment:<name> transformation for forced download
  const safe = (filename || 'image').replace(/[^a-zA-Z0-9-_]/g, '-');
  return secureUrl.replace('/upload/', `/upload/fl_attachment:${safe}/`);
}

let connectPromise = null;

async function ensureDatabase() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'Titiksha-builtattic'
    })
      .then(() => {
        console.log('MongoDB Connected');
        return mongoose.connection.db;
      })
      .catch((err) => {
        connectPromise = null;
        console.error('MongoDB Connection Error:', err);
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

app.post('/auth/register', async (req, res) => {
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

app.post('/auth/login', async (req, res) => {
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

app.get('/user/me', authenticateToken, async (req, res) => {
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

app.get('/stats', async (req, res) => {
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

app.get('/designs', async (req, res) => {
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
app.get('/designs/:id', async (req, res) => {
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

app.get('/associates', async (req, res) => {
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

app.get('/my/designs', authenticateToken, async (req, res) => {
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

app.get('/my/orders', authenticateToken, async (req, res) => {
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

app.get('/my/generations', authenticateToken, async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    const filter = { userId: new mongoose.Types.ObjectId(req.user.userId) };
    if (type) filter.type = type;

    const generations = await db().collection('generations').find(filter, {
      projection: { thumbnail: 0, 'images.data': 0, result: 0 }
    })
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

app.post('/analyze', optionalAuth, upload.single('image'), async (req, res) => {
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
      const genDoc = {
        userId: new mongoose.Types.ObjectId(req.user.userId),
        type: 'site-analysis',
        title: `Site Analysis - ${location || 'Unknown'}`,
        input: { location, projectType, scale, note },
        result: combined,
        hasImage: true,
        status: 'completed',
        createdAt: new Date()
      };

      if (cloudinaryEnabled) {
        try {
          const uploaded = await uploadBufferToCloudinary(image.buffer, {
            userId: req.user.userId,
            type: 'site-analysis',
            label: 'original',
          });
          genDoc.thumbnailUrl = uploaded.secure_url;
          genDoc.thumbnailPublicId = uploaded.public_id;
          genDoc.images = [{
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            label: 'original',
            createdAt: new Date(),
          }];
        } catch (e) {
          console.error('Cloudinary upload failed, falling back to base64:', e);
          const siteThumbnail = `data:${image.mimetype};base64,${image.buffer.toString('base64')}`;
          genDoc.thumbnail = siteThumbnail;
        }
      } else {
        const siteThumbnail = `data:${image.mimetype};base64,${image.buffer.toString('base64')}`;
        genDoc.thumbnail = siteThumbnail;
      }

      await db().collection('generations').insertOne(genDoc);
    }

    res.json({ ...combined, timestamp: new Date() });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze site' });
  }
});

// ─── Masterplan Explorer ──────────────────────────────────────────────────────

app.post('/masterplan', optionalAuth, async (req, res) => {
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

app.post('/floorplan', optionalAuth, async (req, res) => {
  try {
    const { bedrooms, budget, style, area, location, plotWidth, plotLength, floors, facing } = req.body;
    const bhk = bedrooms || 3;
    const totalArea = area || '1200 sqft';
    const plotW = plotWidth || 40;
    const plotL = plotLength || 60;
    const numFloors = floors || 1;
    const facingDir = facing || 'North';

    const prompt = `
You are an expert AEC (Architecture, Engineering, Construction) floor plan architect.
Generate exactly 3 floor plan variants strictly following Indian building norms and codes.

PROJECT REQUIREMENTS:
- Configuration: ${bhk} BHK (bedrooms, hall, kitchen)
- Budget: ${budget || '50-80 Lakhs'}
- Style: ${style || 'Modern'}
- Total built-up area: ${totalArea}
- Plot dimensions: ${plotW} ft x ${plotL} ft
- Number of floors: ${numFloors}
- Plot facing: ${facingDir}
- Location: ${location || 'India'}

MANDATORY AEC NORMS TO FOLLOW (NBC India 2016 / IS 1893 / Local bylaws):
1. SETBACKS: Front 3m min, Rear 2m min, Side 1.5m min (adjust per local bylaws)
2. MINIMUM ROOM SIZES (NBC India):
   - Master Bedroom: min 120 sqft (preferably 150+), min width 3m
   - Bedroom: min 100 sqft, min width 2.7m
   - Living/Drawing Room: min 150 sqft, min width 3.6m
   - Kitchen: min 50 sqft, min width 2.1m, must have exhaust/chimney wall
   - Dining: min 80 sqft
   - Bathroom/Toilet: min 30 sqft attached, min width 1.2m
   - Balcony: min 4 sqft, min width 0.6m
3. CEILING HEIGHT: min 2.75m for habitable rooms, 2.4m for bathroom/kitchen
4. VENTILATION: Every habitable room must have window area >= 1/10th of floor area
5. STAIRCASE: min width 1m for residential, riser max 190mm, tread min 250mm
6. CORRIDOR/PASSAGE: min width 1m
7. FSI/FAR: Compute Floor Space Index = total built-up area / plot area. Must be <= 2.5 typical residential.
8. VASTU (if applicable for Indian context): Master bedroom SW, Kitchen SE, Entrance ${facingDir}
9. PARKING: min 1 car parking (2.5m x 5m) for each dwelling unit
10. FIRE SAFETY: If > 15m height, refuge area + fire staircase required
11. STRUCTURAL: Load-bearing walls min 230mm, RCC columns as per IS 456

For EACH of the 3 plan variants, provide:
- Room layout with EXACT dimensions in feet (width x length) that fit within the plot
- Rooms must tile/pack within the plot rectangle — no overlapping, all rooms must fit
- x,y position of each room relative to top-left corner of the plot (in feet)
- Compliance status for each AEC norm checked

Output ONLY valid JSON in this exact structure:
{
  "plans": [
    {
      "name": "string - variant name",
      "config": "string - e.g. 3BHK Compact",
      "totalArea": "string - total built-up area",
      "estimatedCost": "string - cost estimate",
      "plotWidth": ${plotW},
      "plotLength": ${plotL},
      "floors": ${numFloors},
      "fsi": "number - computed FSI value as string",
      "rooms": [
        {
          "name": "string - room name (e.g. Master Bedroom, Living Room, Kitchen, Bathroom 1, Balcony, Parking, Staircase, Passage)",
          "width": "number - width in feet",
          "length": "number - length in feet",
          "x": "number - x position from left in feet",
          "y": "number - y position from top in feet",
          "area": "string - area in sqft",
          "description": "string - brief note",
          "floor": 0
        }
      ],
      "features": ["string - key architectural features"],
      "compliance": {
        "setbacks": { "status": true, "detail": "Front 3m, Rear 2m, Side 1.5m maintained" },
        "roomSizes": { "status": true, "detail": "All rooms meet NBC minimum sizes" },
        "ventilation": { "status": true, "detail": "Window area >= 1/10th floor area for all rooms" },
        "fsi": { "status": true, "detail": "FSI 1.8 within 2.5 limit" },
        "vastu": { "status": true, "detail": "Master BR in SW, Kitchen in SE, Entry from ${facingDir}" },
        "parking": { "status": true, "detail": "1 covered car park 12.5x10 ft" },
        "fireNorms": { "status": true, "detail": "Single floor, not applicable" },
        "staircase": { "status": true, "detail": "Width 3.5ft, riser 7in, tread 10in" },
        "ceilingHeight": { "status": true, "detail": "2.75m habitable, 2.4m wet areas" }
      },
      "vastu_compliant": true,
      "energy_rating": "string - A+ to D"
    }
  ]
}

CRITICAL RULES:
- All room x,y,width,length values MUST be numbers (not strings)
- Rooms must NOT overlap and must fit within plotWidth x plotLength
- Include setback zones (don't place rooms in setback area — start rooms at ~5ft from front, ~7ft from sides, ~7ft from rear)
- Every plan must have: all bedrooms, living room, kitchen, dining, bathrooms (1 per bedroom + 1 common), at least 1 balcony, passage/corridor, parking
- Return ONLY the JSON, no other text
    `;

    const result = await generateStructuredData(prompt);

    let generationId = null;
    if (req.user) {
      const genResult = await db().collection('generations').insertOne({
        userId: new mongoose.Types.ObjectId(req.user.userId),
        type: 'floor-plan',
        title: `Floor Plan - ${bhk}BHK ${style || 'Modern'}`,
        input: { bedrooms: bhk, budget, style, area: totalArea, location, plotWidth: plotW, plotLength: plotL, floors: numFloors, facing: facingDir },
        result,
        status: 'completed',
        createdAt: new Date()
      });
      generationId = genResult.insertedId;
    }

    res.json({ ...result, generationId });
  } catch (error) {
    console.error('Floor plan error:', error);
    res.status(500).json({ error: 'Failed to generate floor plans' });
  }
});

// ─── Floor Plan Image Generator (Gemini Vision) ─────────────────────────────

app.post('/floorplan-image', optionalAuth, async (req, res) => {
  try {
    const { bedrooms, style, area, plotWidth, plotLength, floors, facing, location, variantName, variantFeatures, roomLayout } = req.body;
    const bhk = bedrooms || 3;
    const plotW = plotWidth || 40;
    const plotL = plotLength || 60;

    // Build variant-specific prompt sections
    const variantSection = variantName
      ? `\nVariant: "${variantName}"${variantFeatures ? `\nKey features of this variant: ${variantFeatures}` : ''}`
      : '';
    const roomSection = roomLayout
      ? `\nExact room layout to draw:\n${roomLayout}`
      : `\nInclude: all ${bhk} bedrooms with attached bathrooms, living room, dining, kitchen, balconies, parking, staircase`;

    const imagePrompt = `Generate a professional 2D architectural floor plan blueprint image for a ${bhk} BHK ${style || 'Modern'} residential house.
${variantSection}

Specifications:
- Plot: ${plotW}ft x ${plotL}ft, Facing: ${facing || 'North'}
- Built-up area: ${area || '1200 sqft'}, Floors: ${floors || 1}
- Location context: ${location || 'India'}
${roomSection}

The floor plan MUST follow these AEC norms:
- NBC India 2016 minimum room sizes (Master BR >= 120sqft, Bedroom >= 100sqft, Kitchen >= 50sqft, Living >= 150sqft)
- Front setback 10ft, side setbacks 5ft, rear setback 7ft
- Vastu: Master bedroom in South-West, Kitchen in South-East, Main entrance from ${facing || 'North'}
- Label every room with name and dimensions (width x length in feet)

Drawing style requirements:
- Clean black lines on white background, professional architectural blueprint style
- Top-down 2D view, NOT 3D or isometric
- Thick outer walls (230mm), thinner internal partition walls (115mm)
- Show door swings as arcs, window marks on external walls
- Include a north arrow indicator and scale bar
- Label all rooms clearly with room name and "W' x L'" dimensions
- Show setback boundaries as dashed lines
- Use standard architectural hatching for wet areas (kitchen, bathrooms)
- Mark column positions as small filled squares at structural points

IMPORTANT: This is the "${variantName || 'Standard'}" variant — make the layout UNIQUE to this variant's specific room arrangement and features. Do NOT generate a generic plan.`;

    const { imageBase64, imageMimeType, textContent } = await generateFloorPlanImage(imagePrompt);

    if (!imageBase64) {
      return res.status(500).json({ error: 'Image generation failed — no image returned from model' });
    }

    // Save image to generation record if authenticated and generationId provided
    let cloudinaryUrl = null;
    if (req.user && req.body.generationId) {
      try {
        if (cloudinaryEnabled) {
          const buffer = Buffer.from(imageBase64, 'base64');
          const uploaded = await uploadBufferToCloudinary(buffer, {
            userId: req.user.userId,
            type: 'floor-plan',
            label: variantName || 'Blueprint',
          });
          cloudinaryUrl = uploaded.secure_url;
          const imgEntry = {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            label: variantName || 'Blueprint',
            createdAt: new Date(),
          };
          await db().collection('generations').updateOne(
            { _id: new mongoose.Types.ObjectId(req.body.generationId), userId: new mongoose.Types.ObjectId(req.user.userId) },
            {
              $set: { thumbnailUrl: uploaded.secure_url, thumbnailPublicId: uploaded.public_id, hasImage: true },
              $push: { images: imgEntry }
            }
          );
        } else {
          const imageDataUri = `data:${imageMimeType};base64,${imageBase64}`;
          await db().collection('generations').updateOne(
            { _id: new mongoose.Types.ObjectId(req.body.generationId), userId: new mongoose.Types.ObjectId(req.user.userId) },
            {
              $set: { thumbnail: imageDataUri, hasImage: true },
              $push: { images: { data: imageDataUri, label: variantName || 'Blueprint', createdAt: new Date() } }
            }
          );
        }
      } catch (e) { console.error('Failed to save image to generation:', e); }
    }

    res.json({
      image: cloudinaryUrl || `data:${imageMimeType};base64,${imageBase64}`,
      url: cloudinaryUrl,
      description: textContent || `${bhk}BHK ${variantName || style || 'Modern'} floor plan`
    });
  } catch (error) {
    console.error('Floor plan image error:', error);
    res.status(500).json({ error: 'Failed to generate floor plan image: ' + (error.message || 'Unknown error') });
  }
});

// ─── Material Finder ──────────────────────────────────────────────────────────

app.post('/materials', optionalAuth, async (req, res) => {
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

// ─── Generation Image Endpoint ────────────────────────────────────────────────

app.get('/my/generations/:id/image', (req, res, next) => {
  // Allow token from query param for <img> tags
  if (req.query.token && !req.headers['authorization']) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  next();
}, authenticateToken, async (req, res) => {
  try {
    const gen = await db().collection('generations').findOne(
      { _id: new mongoose.Types.ObjectId(req.params.id), userId: new mongoose.Types.ObjectId(req.user.userId) },
      { projection: { thumbnail: 1, thumbnailUrl: 1 } }
    );
    if (!gen) return res.status(404).json({ error: 'No image found' });

    // Prefer Cloudinary redirect
    if (gen.thumbnailUrl) {
      return res.redirect(302, gen.thumbnailUrl);
    }

    if (!gen.thumbnail) return res.status(404).json({ error: 'No image found' });

    const matches = gen.thumbnail.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return res.status(500).json({ error: 'Invalid image data' });

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Disposition', `inline; filename="generation-${req.params.id}.${mimeType.split('/')[1]}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// ─── Generation Image Download Endpoint ───────────────────────────────────────

app.get('/my/generations/:id/download', (req, res, next) => {
  if (req.query.token && !req.headers['authorization']) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  next();
}, authenticateToken, async (req, res) => {
  try {
    const gen = await db().collection('generations').findOne(
      { _id: new mongoose.Types.ObjectId(req.params.id), userId: new mongoose.Types.ObjectId(req.user.userId) },
      { projection: { thumbnail: 1, thumbnailUrl: 1, title: 1, type: 1 } }
    );
    if (!gen) return res.status(404).json({ error: 'No image found' });

    const safeTitle = (gen.title || 'generation').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');

    // Prefer Cloudinary signed-download redirect
    if (gen.thumbnailUrl) {
      return res.redirect(302, buildDownloadUrl(gen.thumbnailUrl, safeTitle));
    }

    if (!gen.thumbnail) return res.status(404).json({ error: 'No image found' });

    const matches = gen.thumbnail.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return res.status(500).json({ error: 'Invalid image data' });

    const mimeType = matches[1];
    const ext = mimeType.split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    res.set('Content-Type', mimeType);
    res.set('Content-Disposition', `attachment; filename="${safeTitle}.${ext}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download image' });
  }
});

// ─── Clear All Generations ────────────────────────────────────────────────────

app.delete('/my/generations', authenticateToken, async (req, res) => {
  console.log('DELETE /my/generations triggered for user:', req.user.userId);
  try {
    const userFilter = { userId: new mongoose.Types.ObjectId(req.user.userId) };

    // Collect Cloudinary publicIds before deleting the docs
    if (cloudinaryEnabled) {
      const docs = await db().collection('generations')
        .find(userFilter, { projection: { thumbnailPublicId: 1, 'images.publicId': 1 } })
        .toArray();
      const publicIds = docs.flatMap(d => [
        d.thumbnailPublicId,
        ...((d.images || []).map(i => i.publicId))
      ]).filter(Boolean);
      const unique = [...new Set(publicIds)];
      if (unique.length) {
        try {
          await cloudinary.api.delete_resources(unique);
          console.log(`Cloudinary: deleted ${unique.length} assets`);
        } catch (e) {
          console.error('Cloudinary delete failed (continuing with DB delete):', e);
        }
      }
    }

    const result = await db().collection('generations').deleteMany(userFilter);
    console.log(`DELETE SUCCESS: Removed ${result.deletedCount} documents`);
    res.json({ deleted: result.deletedCount, message: 'All generation history cleared' });
  } catch (error) {
    console.error('DELETE ERROR:', error);
    res.status(500).json({ error: 'Failed to clear generations' });
  }
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Builtattic backend running on port ${port}`);
  });
}

export default app;
