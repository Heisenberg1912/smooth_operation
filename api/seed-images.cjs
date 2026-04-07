/**
 * One-time script to update designs and user avatars in MongoDB
 * with publicly accessible Shopify CDN URLs from builtattic.com
 * Run: node api/seed-images.cjs
 */
require('dotenv').config();
const mongoose = require('mongoose');

const CDN = 'https://www.builtattic.com/cdn/shop/files';

// Mapping: design title -> { thumbnail, images, extra fields from Shopify }
const designImages = {
  '2BHK DUPLEX': {
    thumbnail: `${CDN}/South_3aa3c8f0-3572-434d-8bcd-9801de062003.png?v=1768047728&width=800`,
    images: [
      `${CDN}/South_3aa3c8f0-3572-434d-8bcd-9801de062003.png?v=1768047728&width=1200`,
      `${CDN}/East_db5a6263-ceb9-4a2b-84d1-ebe47493307f.png?v=1768047728&width=1200`,
    ],
    shopifyPrice: 18124.99
  },
  'Community Centre': {
    thumbnail: `${CDN}/1_edb79eee-af0e-4c7a-b86f-9d2b0266c81d.jpg?v=1769066520&width=800`,
    images: [
      `${CDN}/1_edb79eee-af0e-4c7a-b86f-9d2b0266c81d.jpg?v=1769066520&width=1200`,
      `${CDN}/2_a073469a-ee7e-48ac-9749-d12c720447e5.jpg?v=1769066520&width=1200`,
    ],
    shopifyPrice: null
  },
  'Holiday Villa': {
    thumbnail: `${CDN}/01_d3bfaec0-ebc6-4189-89c0-2f507f01ddbd.png?v=1768559768&width=800`,
    images: [
      `${CDN}/01_d3bfaec0-ebc6-4189-89c0-2f507f01ddbd.png?v=1768559768&width=1200`,
    ],
    shopifyPrice: 253124.99
  },
  'Lavish Villa': {
    thumbnail: `${CDN}/Courtyard_1.png?width=800`,
    images: [
      `${CDN}/Courtyard_1.png?width=1200`,
    ],
    shopifyPrice: 129949.99
  }
};

// Additional designs from Shopify that may not be in DB yet
const newDesigns = [
  {
    title: 'Sloped Roof Cottage in the Woods',
    category: 'Residential',
    style: 'Eco-Architecture',
    thumbnail: `${CDN}/1_77810ed5-b9d0-427d-b417-ab07b9f74f50.png?width=800`,
    images: [`${CDN}/1_77810ed5-b9d0-427d-b417-ab07b9f74f50.png?width=1200`],
    totalPrice: 17624.99,
    description: 'A sloped roof cottage nestled in a wooded setting, designed with natural materials and sustainable principles for a serene retreat.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 1, parking: null }
  },
  {
    title: 'Brooklyn Zen',
    category: 'Residential',
    style: 'Modern',
    thumbnail: `${CDN}/jb1.png?width=800`,
    images: [`${CDN}/jb1.png?width=1200`],
    totalPrice: 18437.49,
    description: 'A modern residential design inspired by Brooklyn aesthetics with zen garden elements and clean lines.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: null, parking: null }
  },
  {
    title: 'House by the Cliff',
    category: 'Residential',
    style: 'Contemporary',
    thumbnail: `${CDN}/HBC1_f086b69e-5172-44eb-9691-d777aefbedc2.png?width=800`,
    images: [`${CDN}/HBC1_f086b69e-5172-44eb-9691-d777aefbedc2.png?width=1200`],
    totalPrice: 37499.99,
    description: 'A dramatic cliffside residence with cantilevered volumes, panoramic views, and rugged material palette.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 2, parking: null }
  },
  {
    title: 'Roman Courtyard Villa',
    category: 'Residential',
    style: 'Classical',
    thumbnail: `${CDN}/rom1.png?width=800`,
    images: [`${CDN}/rom1.png?width=1200`],
    totalPrice: 18749.99,
    description: 'A villa inspired by Roman courtyard architecture, featuring columns, open-air atrium, and classical proportions.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 1, parking: null }
  },
  {
    title: 'Tropical Flood-Responsive Residence',
    category: 'Residential',
    style: 'Eco-Architecture',
    thumbnail: `${CDN}/1_495bba2f-96d7-4c5d-b26b-001aaab8dc55.jpg?width=800`,
    images: [`${CDN}/1_495bba2f-96d7-4c5d-b26b-001aaab8dc55.jpg?width=1200`],
    totalPrice: 18437.49,
    description: 'A flood-responsive tropical home elevated on stilts with passive cooling and rainwater management.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 2, parking: null }
  },
  {
    title: 'Residential Tower',
    category: 'Residential',
    style: 'Modern',
    thumbnail: `${CDN}/RT1.png?width=800`,
    images: [`${CDN}/RT1.png?width=1200`],
    totalPrice: 17624.99,
    description: 'A contemporary residential tower with stacked volumes and communal amenities.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 10, parking: null }
  },
  {
    title: 'Tropical Row House',
    category: 'Residential',
    style: 'Tropical',
    thumbnail: `${CDN}/1_1506380e-6eb8-4d0b-88f4-1dc8aac2545c.jpg?width=800`,
    images: [`${CDN}/1_1506380e-6eb8-4d0b-88f4-1dc8aac2545c.jpg?width=1200`],
    totalPrice: 17624.99,
    description: 'A narrow tropical row house optimized for ventilation, daylight, and dense urban contexts.',
    specifications: { area: null, bedrooms: 2, bathrooms: null, floors: 2, parking: null }
  },
  {
    title: 'Riverside Office',
    category: 'Commercial',
    style: 'Modern',
    thumbnail: `${CDN}/off1_764c33a4-4ee6-4ac8-a73e-12c0ba3d3721.png?width=800`,
    images: [`${CDN}/off1_764c33a4-4ee6-4ac8-a73e-12c0ba3d3721.png?width=1200`],
    totalPrice: 234999.99,
    description: 'A modern office complex along the riverside with floor-to-ceiling glazing and landscaped terraces.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 4, parking: null }
  },
  {
    title: 'Terraced Mixed-Use Commercial Complex',
    category: 'Commercial',
    style: 'Contemporary',
    thumbnail: `${CDN}/1_bd9c92ec-4815-48e7-a305-d2c5315b0513.jpg?width=800`,
    images: [`${CDN}/1_bd9c92ec-4815-48e7-a305-d2c5315b0513.jpg?width=1200`],
    totalPrice: 1518344.99,
    description: 'A terraced mixed-use complex combining retail, office, and public spaces with green roof terraces.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 5, parking: null }
  },
  {
    title: 'Circular Restro-Bar',
    category: 'Commercial',
    style: 'Contemporary',
    thumbnail: `${CDN}/01_bcbcf00b-a956-4929-985e-7ccca84f6498.jpg?width=800`,
    images: [`${CDN}/01_bcbcf00b-a956-4929-985e-7ccca84f6498.jpg?width=1200`],
    totalPrice: 232702.88,
    description: 'A circular restaurant-bar with dramatic curved facades, open-air dining, and immersive ambiance.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 1, parking: null }
  },
  {
    title: 'Courtyard Tech Campus',
    category: 'Commercial',
    style: 'Modern',
    thumbnail: `${CDN}/1_e73032f0-4703-439e-91ab-9259ea3fa103.png?width=800`,
    images: [`${CDN}/1_e73032f0-4703-439e-91ab-9259ea3fa103.png?width=1200`],
    totalPrice: 232702.88,
    description: 'A tech campus organized around courtyards with flexible workspaces and collaborative zones.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 3, parking: null }
  },
  {
    title: 'Dark Tourism Memorial: Bhopal',
    category: 'Institutional',
    style: 'Brutalism',
    thumbnail: `${CDN}/Untitleddesign.jpg?width=800`,
    images: [`${CDN}/Untitleddesign.jpg?width=1200`],
    totalPrice: 247556.25,
    description: 'A memorial and museum complex for dark tourism in Bhopal, designed with raw concrete and contemplative spaces.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 2, parking: null }
  },
  {
    title: 'Ovular Semiconductor Manufacturing Campus',
    category: 'Industrial',
    style: 'Neo-Futurism',
    thumbnail: `${CDN}/osc1.png?width=800`,
    images: [`${CDN}/osc1.png?width=1200`],
    totalPrice: 792179.99,
    description: 'An oval-shaped high-tech semiconductor manufacturing campus with cleanroom facilities.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 3, parking: null }
  },
  {
    title: 'Net-zero Agricultural Campus',
    category: 'Agricultural',
    style: 'Eco-Architecture',
    thumbnail: `${CDN}/mf1.jpg?width=800`,
    images: [`${CDN}/mf1.jpg?width=1200`],
    totalPrice: 126528.75,
    description: 'A net-zero agricultural campus combining farm-to-table operations with education and research.',
    specifications: { area: null, bedrooms: null, bathrooms: null, floors: 1, parking: null }
  },
];

// Associate avatar mapping: name -> shopify CDN avatar URL
const associateAvatars = {
  'Akshat Chaturvedi': `${CDN}/Akshat.jpg?width=400`,
  'Ar. Bhairavi Jain': `${CDN}/Ar.BhairaviJain_1f88d500-7046-462e-acc2-7e36dbfb9958.jpg?width=400`,
  'Bhairavi Jain': `${CDN}/Ar.BhairaviJain_1f88d500-7046-462e-acc2-7e36dbfb9958.jpg?width=400`,
  'Ar.  Dipankar Bagde': `${CDN}/Ar._Dipankar_Bagde_1.jpg?width=400`,
  'Dipankar Bagde': `${CDN}/Ar._Dipankar_Bagde_1.jpg?width=400`,
  'Ar. Kartikey Pawar': `${CDN}/Ar.KartikeyPawar_2967d419-a751-4829-be0b-80ce40622eed.jpg?width=400`,
  'Kartikey Pawar': `${CDN}/Ar.KartikeyPawar_2967d419-a751-4829-be0b-80ce40622eed.jpg?width=400`,
  'Ar. Mayank Pandagre': `${CDN}/Ar._Mayank_Pandagre.jpg?width=400`,
  'Mayank Pandagre': `${CDN}/Ar._Mayank_Pandagre.jpg?width=400`,
  'Sakshi Chachre': `${CDN}/Sakshi.jpg?width=400`,
  'Ar. Shivam Raotole': `${CDN}/Ar._Shivam_Raotole.jpg?width=400`,
  'Shivam Raotole': `${CDN}/Ar._Shivam_Raotole.jpg?width=400`,
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'Titiksha-builtattic'
  });
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  // 1. Update existing designs with Shopify CDN images
  for (const [title, data] of Object.entries(designImages)) {
    const result = await db.collection('designs').updateOne(
      { title },
      { $set: { publicThumbnail: data.thumbnail, publicImages: data.images, updatedAt: new Date() } }
    );
    console.log(`Design "${title}": ${result.modifiedCount ? 'updated' : 'not found'}`);
  }

  // 2. Insert new designs from Shopify (only if not already present)
  const ownerUser = await db.collection('users').findOne({ role: 'associate' }, { sort: { createdAt: 1 } });
  const ownerId = ownerUser?._id?.toString() || 'system';

  for (const design of newDesigns) {
    const exists = await db.collection('designs').findOne({ title: design.title });
    if (exists) {
      await db.collection('designs').updateOne(
        { title: design.title },
        { $set: { publicThumbnail: design.thumbnail, publicImages: design.images, updatedAt: new Date() } }
      );
      console.log(`Design "${design.title}": already exists, updated images`);
    } else {
      await db.collection('designs').insertOne({
        userId: ownerId,
        title: design.title,
        description: design.description,
        category: design.category,
        typology: '',
        style: design.style,
        climate: '',
        thumbnail: design.thumbnail,
        publicThumbnail: design.thumbnail,
        images: design.images,
        publicImages: design.images,
        specifications: design.specifications,
        priceSqft: null,
        totalPrice: design.totalPrice,
        deliveryTime: '',
        tags: [],
        status: 'published',
        views: 0,
        saves: 0,
        inquiries: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Design "${design.title}": inserted`);
    }
  }

  // 3. Update associate avatars with Shopify CDN URLs
  for (const [name, avatarUrl] of Object.entries(associateAvatars)) {
    const result = await db.collection('users').updateMany(
      { name: { $regex: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
      { $set: { publicAvatar: avatarUrl, updatedAt: new Date() } }
    );
    if (result.modifiedCount) console.log(`Avatar "${name}": updated ${result.modifiedCount} user(s)`);
  }

  const totalDesigns = await db.collection('designs').countDocuments({ status: 'published' });
  console.log(`\nDone! Total published designs: ${totalDesigns}`);

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
