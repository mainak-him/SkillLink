/**
 * SkillLink - Comprehensive Seed Script
 * Creates realistic test data: 35 artisans, 15 clients, 100 jobs, 150+ notifications, 60+ ratings
 * Run AFTER importing the SQL schema: mysql skilllink_db < skilllink.sql
 * Then: node seed.js
 * 
 * Password for all accounts: Password123
 * Test OTP for password reset: 1234
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'skilllink_db'
};

async function seed() {
  const conn = await mysql.createConnection(DB);
  const hash = await bcrypt.hash('Password123', 10);
  const now = new Date();

  console.log('🌱 Starting comprehensive SkillLink seed...\n');

  // ======================== USERS ========================
  // 35 Artisans (25 verified + 10 pending/rejected)
  const artisanNames = [
    'James Kamau', 'Peter Otieno', 'Grace Wanjiku', 'David Njoroge', 'Samuel Kiprotich',
    'Alice Muthoni', 'Brian Omondi', 'Caroline Auma', 'Dennis Mutua', 'Eva Cherono',
    'Frank Ndegwa', 'Helen Akinyi', 'Isaac Waweru', 'Joyce Njeri', 'Kevin Ochieng',
    'Lillian Akinyi', 'Moses Kipruto', 'Nancy Wairimu', 'Oscar Otieno', 'Pauline Achieng',
    'Quinter Atieno', 'Raphael Odhiambo', 'Sylvia Chepkoech', 'Titus Mwangi', 'Ursula Awuor',
    'Vincent Omondi', 'Winnie Achieng', 'Xavier Oduor', 'Yvonne Atieno', 'Zachary Mwangi',
    'Amy Kipchoge', 'Bernice Ochieng', 'Catherine Njoroge', 'Daniel Kiprop', 'Esther Mwangi'
  ];

  const trades = ['Plumbing', 'Electrical', 'Carpentry', 'Masonry', 'Painting', 'Welding', 'Tiling', 'General Repairs'];
  const locations = [
    { lat: -1.2864, lng: 36.8172, name: 'CBD, Nairobi' },
    { lat: -1.2663, lng: 36.8010, name: 'Westlands, Nairobi' },
    { lat: -1.2884, lng: 36.7870, name: 'Kilimani, Nairobi' },
    { lat: -1.3351, lng: 36.7147, name: 'Karen, Nairobi' },
    { lat: -1.2302, lng: 36.8726, name: 'Ruaraka, Nairobi' },
    { lat: -1.3178, lng: 36.8962, name: 'Embakasi, Nairobi' },
    { lat: -1.3133, lng: 36.7844, name: 'Kibera, Nairobi' },
    { lat: -1.2198, lng: 36.8946, name: 'Kasarani, Nairobi' }
  ];

  const artisanBios = [
    'NITA-certified plumber with 7 years experience in residential and commercial installations.',
    'Electrical expert specializing in wiring, lighting, and solar installations.',
    'Master carpenter – custom furniture and general carpentry. Fast turnaround.',
    'Masonry specialist with 10+ years building walls, gates, and concrete work.',
    'Professional painter – interior, exterior, faux finishes. Quality guaranteed.',
    'Welding and metal fabrication – gates, railings, custom designs.',
    'Tiling expert – bathroom, kitchen, and floor installations with premium finishes.',
    'General repairs – plumbing, electrical, carpentry. One-stop solution for your home.',
    'Certified and verified. Available for emergency calls 24/7.',
    'Portfolio available. References from 50+ satisfied customers.',
    'Licensed by NITA. Insured and bonded for all jobs.',
    'Specializing in modern smart home installations.',
    'Budget-friendly quotes with premium workmanship.',
    'Quick response time – same-day quotes and scheduling.',
    'Trusted by both residential and commercial clients.'
  ];

  // 15 Clients
  const clients = [];
  const clientNames = [
    'Mary Njeri', 'John Mwangi', 'Sarah Odhiambo', 'Susan Wambui', 'Michael Kipruto',
    'Esther Nyokabi', 'Patrick Maina', 'Lucy Atieno', 'George Otieno', 'Rachel Mumbi',
    'Peter Kamau', 'Jane Akinyi', 'Daniel Ochieng', 'Florence Achieng', 'Joseph Mwangi'
  ];

  const artisans = [];
  for (let i = 0; i < 35; i++) {
    const trade = trades[i % trades.length];
    const loc = locations[i % locations.length];
    const vs = i < 25 ? 'verified' : (i < 30 ? 'pending' : 'rejected');
    artisans.push({
      name: artisanNames[i],
      phone: `07123${String(45000 + i).padStart(5, '0')}`,
      email: `artisan${i + 1}@skilllink.co.ke`,
      trade,
      bio: artisanBios[Math.floor(Math.random() * artisanBios.length)] + (vs === 'verified' ? ' ✓ Verified' : ''),
      lat: loc.lat,
      lng: loc.lng,
      loc: loc.name,
      vs,
      pic: 'default.png'
    });
  }

  for (let i = 0; i < 15; i++) {
    const loc = locations[i % locations.length];
    clients.push({
      name: clientNames[i],
      phone: `07123${String(55000 + i).padStart(5, '0')}`,
      email: `client${i + 1}@skilllink.co.ke`,
      lat: loc.lat,
      lng: loc.lng,
      loc: loc.name,
      pic: 'default.png'
    });
  }

  // Admins
  const admins = [
    { name:'Super Admin', phone:'0700000000', email:'admin@skilllink.co.ke' },
    { name:'Backup Admin', phone:'0710000000', email:'backup@skilllink.co.ke' }
  ];

  // Insert artisans
  for (const a of artisans) {
    await conn.execute(
      `INSERT IGNORE INTO users (name,phone,email,password,role,location_lat,location_lng,location_name,trade,bio,verification_status,profile_pic)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [a.name, a.phone, a.email, hash, 'artisan', a.lat, a.lng, a.loc, a.trade, a.bio, a.vs, a.pic]
    );
  }
  console.log(`✓ Inserted ${artisans.length} artisans`);

  // Insert clients
  for (const c of clients) {
    await conn.execute(
      `INSERT IGNORE INTO users (name,phone,email,password,role,location_lat,location_lng,location_name,profile_pic)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [c.name, c.phone, c.email, hash, 'client', c.lat, c.lng, c.loc, c.pic]
    );
  }
  console.log(`✓ Inserted ${clients.length} clients`);

  // Insert admins
  for (const ad of admins) {
    await conn.execute(
      `INSERT IGNORE INTO users (name,phone,email,password,role,profile_pic,verification_status)
       VALUES (?,?,?,?,?,?,?)`,
      [ad.name, ad.phone, ad.email, hash, 'admin', 'default.png', 'verified']
    );
  }
  console.log(`✓ Inserted ${admins.length} admins`);

  // Retrieve all IDs
  const artisanRows = await conn.execute(`SELECT user_id, trade, verification_status FROM users WHERE role='artisan'`);
  const artisanIds = artisanRows[0];
  const clientRows = await conn.execute(`SELECT user_id FROM users WHERE role='client'`);
  const clientIds = clientRows[0].map(r => r.user_id);

  // ======================== CREDENTIALS (for most artisans) ========================
  const creds = [];
  for (const art of artisanIds) {
    // For verified or random, add credentials
    if (art.verification_status === 'verified' || Math.random() > 0.3) {
      let issuing = 'NITA';
      let idx = `NITA-2022-00${art.user_id}`;
      let serial = `NITA-CERT-10${art.user_id}`;
      let year = 2022;
      if (art.trade === 'Carpentry') { issuing = 'KNEC'; idx = `KNEC-2020-00${art.user_id}`; serial = `KNEC-CERT-20${art.user_id}`; year = 2020; }
      if (art.trade === 'Electrical') { issuing = 'EPRA'; idx = `EPRA-2023-00${art.user_id}`; serial = `EPRA-CERT-40${art.user_id}`; year = 2023; }
      if (art.trade === 'Masonry') { issuing = 'NCA'; idx = `NCA-2021-00${art.user_id}`; serial = `NCA-CERT-30${art.user_id}`; year = 2021; }
      creds.push([art.user_id, issuing, idx, serial, year, art.trade, 1]);
    }
  }
  for (const c of creds) {
    await conn.execute(
      `INSERT IGNORE INTO credentials (artisan_id,issuing_authority,index_number,serial_number,exam_year,trade_specialization,verified) VALUES (?,?,?,?,?,?,?)`,
      c
    );
  }
  console.log(`✓ Inserted ${creds.length} credentials`);

  // ======================== JOBS (100 jobs with variety) ========================
  const jobTitles = [
    'Fix leaking tap', 'Install new socket outlet', 'Build wooden shelf unit', 'Paint bedroom walls',
    'Unblock toilet', 'Replace broken roof tiles', 'Assemble furniture', 'Repair metal gate',
    'Install ceiling fan', 'Fix burst water pipe', 'Lay new floor tiles', 'Install security lights',
    'Build garden fence', 'Repair water heater', 'Install curtain rails', 'Fix loose railing',
    'Paint exterior wall', 'Replace door lock', 'Install kitchen cabinets', 'Fix electrical short',
    'Build brick wall', 'Repair roof leak', 'Install water pump', 'Fix leaking shower',
    'Build wooden wardrobe', 'Repair drywall', 'Install solar panels', 'Fix broken window',
    'Replace old wiring', 'Build concrete slab', 'Fix car port roof', 'Paint gate',
    'Install pendant lights', 'Fix plumbing under sink', 'Build storage cabinet', 'Repaint living room',
    'Install ceiling paint', 'Fix cracked wall', 'Replace window frame', 'Install new door',
    'Paint cabinets', 'Fix leaking gutter', 'Install wall tiles', 'Build wooden deck',
    'Repair fence post', 'Paint metal doors', 'Install light fixtures', 'Fix bathroom tiles',
    'Build concrete wall', 'Install power outlets'
  ];

  const jobDescriptions = [
    'Water is leaking constantly. Need urgent fix.',
    'Need new outlets installed in bedroom and living room.',
    'Want to add storage shelves to spare room.',
    'Bedroom needs fresh paint – tired of current color.',
    'Toilet keeps backing up – needs professional unblocking.',
    'Roof is leaking in rainy season – need to replace damaged tiles.',
    'New furniture arrived – need assembly help.',
    'Gate hinges broken – needs proper repair or replacement.',
    'Need ceiling fan installed in bedroom.',
    'Burst water pipe in kitchen – water spraying everywhere!',
    'Old tiles in kitchen – want new modern tiles laid.',
    'Need security lights around compound perimeter.',
    'Want to fence off garden area – need secure fencing.',
    'Water heater not heating properly.',
    'Need curtain rods and rails installed in living room.',
    'Railing on balcony is loose and dangerous.',
    'Exterior walls need repainting – very faded.',
    'Door lock broken – can\'t lock from inside.',
    'Installing new kitchen – need cabinets fitted.',
    'Electrical issues – lights flickering intermittently.'
  ];

  const jobStatuses = ['open', 'assigned', 'completed', 'confirmed', 'closed', 'disputed'];
  const jobs = [];
  
  for (let i = 0; i < 100; i++) {
    const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
    const skill = trades[Math.floor(Math.random() * trades.length)];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    
    let artisanId = null;
    let status = 'open';
    let paymentStatus = 'unpaid';
    let quotedPrice = null;
    
    // 40% open, 20% assigned, 15% completed, 15% confirmed, 10% closed, 5% disputed
    const rand = Math.random();
    const artisanRows_local = artisanRows[0];
    if (rand < 0.40) {
      status = 'open';
    } else if (rand < 0.60) {
      status = 'assigned';
      artisanId = artisanRows_local[Math.floor(Math.random() * artisanRows_local.length)].user_id;
    } else if (rand < 0.75) {
      status = 'completed';
      artisanId = artisanRows_local[Math.floor(Math.random() * artisanRows_local.length)].user_id;
    } else if (rand < 0.85) {
      status = 'confirmed';
      artisanId = artisanRows_local[Math.floor(Math.random() * artisanRows_local.length)].user_id;
      quotedPrice = Math.floor(Math.random() * 20000) + 1500;
    } else if (rand < 0.95) {
      status = 'closed';
      artisanId = artisanRows_local[Math.floor(Math.random() * artisanRows_local.length)].user_id;
      paymentStatus = 'paid';
      quotedPrice = Math.floor(Math.random() * 25000) + 2000;
    } else {
      status = 'disputed';
      artisanId = artisanRows_local[Math.floor(Math.random() * artisanRows_local.length)].user_id;
    }

    const budgetMin = Math.floor(Math.random() * 5000) + 500;
    const budgetMax = budgetMin + Math.floor(Math.random() * 20000) + 1000;
    const createdDaysAgo = Math.floor(Math.random() * 45);
    const created = new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000);

    jobs.push({
      client_id: clientId,
      assigned_artisan_id: artisanId,
      job_title: jobTitles[i % jobTitles.length],
      job_description: jobDescriptions[Math.floor(Math.random() * jobDescriptions.length)],
      required_skill: skill,
      job_location_lat: loc.lat,
      job_location_lng: loc.lng,
      job_location_name: loc.name,
      budget_min: budgetMin,
      budget_max: budgetMax,
      quoted_price: quotedPrice,
      payment_status: paymentStatus,
      status,
      created_at: created
    });
  }

  for (const j of jobs) {
    await conn.execute(
      `INSERT INTO jobs (client_id,assigned_artisan_id,job_title,job_description,required_skill,job_location_lat,job_location_lng,job_location_name,budget_min,budget_max,quoted_price,payment_status,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [j.client_id, j.assigned_artisan_id, j.job_title, j.job_description, j.required_skill, j.job_location_lat, j.job_location_lng, j.job_location_name, j.budget_min, j.budget_max, j.quoted_price, j.payment_status, j.status, j.created_at]
    );
  }
  console.log(`✓ Inserted ${jobs.length} jobs`);

  // Add simple payment references for paid jobs to reflect recorded payments
  await conn.execute(`UPDATE jobs SET payment_reference = CONCAT('MPESA', LPAD(job_id,6,'0')) WHERE payment_status='paid' AND (payment_reference IS NULL OR payment_reference='')`);
  console.log('✓ Added payment references for paid jobs');

  // ======================== RATINGS (varied) ========================
  const closedJobs = await conn.execute(`SELECT job_id, client_id, assigned_artisan_id FROM jobs WHERE status='closed' AND assigned_artisan_id IS NOT NULL`);
  const ratingComments = [
    'Excellent work, very professional!', 'Good job, would hire again.', 'Satisfactory, but a bit slow.',
    'Amazing quality, thank you!', 'Fair price and good communication.', 'Could be better, but okay.',
    'Outstanding service!', 'Very punctual and clean.', 'Highly recommended!', 'Not bad, but overpriced.',
    'Terrible experience – late and messy.', 'Disappointing quality, took too long.', 'Average, nothing special.',
    'Fantastic! Will definitely hire again.', 'Poor communication, would not recommend.'
  ];
  let ratingInserted = 0;
  for (const job of closedJobs[0]) {
    let rating = 5;
    const rand = Math.random();
    if (rand < 0.2) rating = 1;
    else if (rand < 0.4) rating = 2;
    else if (rand < 0.6) rating = 3;
    else if (rand < 0.8) rating = 4;
    else rating = 5;
    const comment = ratingComments[Math.floor(Math.random() * ratingComments.length)];
    await conn.execute(
      `INSERT IGNORE INTO ratings (job_id, rater_id, rated_user_id, rating, comment) VALUES (?,?,?,?,?)`,
      [job.job_id, job.client_id, job.assigned_artisan_id, rating, comment]
    );
    ratingInserted++;
    // Artisan rates client
    let artisanRating = 5;
    const rand2 = Math.random();
    if (rand2 < 0.25) artisanRating = 3;
    else if (rand2 < 0.5) artisanRating = 4;
    else artisanRating = 5;
    const artisanComment = ratingComments[Math.floor(Math.random() * ratingComments.length)];
    await conn.execute(
      `INSERT IGNORE INTO ratings (job_id, rater_id, rated_user_id, rating, comment) VALUES (?,?,?,?,?)`,
      [job.job_id, job.assigned_artisan_id, job.client_id, artisanRating, artisanComment]
    );
    ratingInserted++;
  }
  console.log(`✓ Inserted ${ratingInserted} ratings`);

  // ======================== DISPUTE RESPONSES ========================
  const disputedJobs = await conn.execute(`SELECT job_id, assigned_artisan_id FROM jobs WHERE status='disputed'`);
  for (const job of disputedJobs[0]) {
    const concern = `I completed the work as agreed. The client refused to pay. I have photo evidence.`;
    await conn.execute(
      `INSERT IGNORE INTO dispute_responses (job_id, responder_id, message) VALUES (?,?,?)`,
      [job.job_id, job.assigned_artisan_id, concern]
    );
  }
  console.log(`✓ Inserted ${disputedJobs[0].length} dispute responses`);

  // ======================== NOTIFICATIONS (many) ========================
  const allAssignedJobs = await conn.execute(`SELECT job_id, client_id, assigned_artisan_id, job_title FROM jobs WHERE assigned_artisan_id IS NOT NULL`);
  let notifCount = 0;
  for (const job of allAssignedJobs[0]) {
    await conn.execute(
      `INSERT IGNORE INTO notifications (user_id, message, type, related_job_id) VALUES (?,?,?,?)`,
      [job.client_id, `Artisan has accepted your job "${job.job_title}".`, 'job_accepted', job.job_id]
    );
    notifCount++;
    await conn.execute(
      `INSERT IGNORE INTO notifications (user_id, message, type, related_job_id) VALUES (?,?,?,?)`,
      [job.assigned_artisan_id, `Client confirmed work for "${job.job_title}". Please quote your price.`, 'job_confirmed', job.job_id]
    );
    notifCount++;
    if (Math.random() > 0.7) {
      await conn.execute(
        `INSERT IGNORE INTO notifications (user_id, message, type, related_job_id) VALUES (?,?,?,?)`,
        [job.client_id, `Thank you for using SkillLink. Please rate your artisan.`, 'reminder', job.job_id]
      );
      notifCount++;
    }
  }
  console.log(`✓ Inserted approximately ${notifCount} notifications`);

  // ======================== SIMULATED REGISTRY (ensure at least 20 entries) ========================
  const [existingReg] = await conn.execute(`SELECT COUNT(*) as cnt FROM simulated_registry`);
  if (existingReg[0].cnt < 20) {
    const moreRegistry = [
      ['NITA', 'NITA-2023-016', 'NITA-CERT-10216', 2023, 'Welding', 'Martin Odhiambo'],
      ['KNEC', 'KNEC-2021-017', 'KNEC-CERT-20417', 2021, 'Tiling', 'Lucy Adhiambo'],
      ['NCA', 'NCA-2022-018', 'NCA-CERT-30618', 2022, 'Masonry', 'Peter Kiprop'],
      ['EPRA', 'EPRA-2020-019', 'EPRA-CERT-40719', 2020, 'Electrical', 'Joyce Wanjiru'],
      ['TVET CDACC', 'TVET-2022-020', 'TVET-CERT-50820', 2022, 'Plumbing', 'Samuel Mwangi']
    ];
    for (const r of moreRegistry) {
      await conn.execute(
        `INSERT IGNORE INTO simulated_registry (issuing_authority,index_number,serial_number,exam_year,trade_specialization,holder_name) VALUES (?,?,?,?,?,?)`,
        r
      );
    }
  }
  console.log(`✓ Simulated registry ready`);

  await conn.end();
  console.log('\n✅ SEEDING COMPLETE - Massive dataset ready!');
  const verifiedCount = artisanIds.filter(a => a.verification_status === 'verified').length;
  const pendingCount = artisanIds.filter(a => a.verification_status === 'pending').length;
  const rejectedCount = artisanIds.filter(a => a.verification_status === 'rejected').length;
  console.log(`   Artisans: ${artisans.length} (${verifiedCount} verified, ${pendingCount} pending, ${rejectedCount} rejected)`);
  console.log(`   Clients: ${clients.length}`);
  console.log(`   Jobs: ${jobs.length} (open/assigned/completed/confirmed/closed/disputed)`);
  console.log(`   Ratings: ${ratingInserted}`);
  console.log(`   Disputes: ${disputedJobs[0].length}`);
  console.log(`\n   Login with any phone or email + password: Password123`);
}

seed().catch(e => { console.error(e); process.exit(1); });