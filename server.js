require('dotenv').config();
const express   = require('express');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const cors      = require('cors');
const db        = require('./db');

const app    = express();
const SECRET = process.env.JWT_SECRET || 'skilllink_secret';
const PORT   = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Helper: Kenyan phone validation ─────────────────────────
function isValidKenyanPhone(phone) {
  return /^(07|01)[0-9]{8}$/.test(phone);
}

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));
// Multer – profile pictures
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype);
    cb(ok ? null : new Error('Images only'), ok);
  }
});

// ── Auth middleware ─────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Haversine distance (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── AUTH ROUTES ─────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password, role, location_lat, location_lng, location_name, trade } = req.body;
    if (!name || !phone || !password || !role) return res.status(400).json({ error: 'Name, phone, password and role are required.' });
    if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    if (!['artisan','client'].includes(role)) return res.status(400).json({ error: 'Role must be artisan or client.' });
    if (!isValidKenyanPhone(phone)) return res.status(400).json({ error: 'Invalid Kenyan phone number (must be 10 digits starting with 07 or 01).' });
    const [exists] = await db.query('SELECT user_id FROM users WHERE phone=?', [phone]);
    if (exists.length) return res.status(409).json({ error: 'Phone number already registered.' });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name,phone,email,password,role,location_lat,location_lng,location_name,trade) VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, phone, email||null, hashed, role, location_lat||null, location_lng||null, location_name||null, trade||null]
    );
    const token = jwt.sign({ user_id: result.insertId, role, name }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { user_id: result.insertId, name, role, phone, trade, verification_status: 'pending' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });
    const [rows] = await db.query('SELECT * FROM users WHERE phone=? OR email=?', [phone, phone]);
    if (!rows.length) return res.status(401).json({ error: 'No account found with that phone/email.' });
    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Incorrect password.' });
    const token = jwt.sign({ user_id: user.user_id, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phone, otp, new_password } = req.body;
    if (!phone || !otp || !new_password) return res.status(400).json({ error: 'Phone, OTP and new password required.' });
    if (otp !== '1234') return res.status(400).json({ error: 'Invalid OTP.' });
    if (new_password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    const [rows] = await db.query('SELECT user_id FROM users WHERE phone=?', [phone]);
    if (!rows.length) return res.status(404).json({ error: 'No account with that phone number.' });
    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password=? WHERE phone=?', [hashed, phone]);
    res.json({ message: 'Password reset successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── USER / PROFILE ROUTES ───────────────────────────────────
app.get('/api/users/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id,name,phone,email,role,location_lat,location_lng,location_name,profile_pic,trade,bio,verification_status,is_available,created_at FROM users WHERE user_id=?', [req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/me', auth, async (req, res) => {
  try {
    const { name, email, location_lat, location_lng, location_name, trade, bio } = req.body;
    await db.query(
      `UPDATE users SET name=COALESCE(?,name), email=COALESCE(?,email), location_lat=COALESCE(?,location_lat),
       location_lng=COALESCE(?,location_lng), location_name=COALESCE(?,location_name),
       trade=COALESCE(?,trade), bio=COALESCE(?,bio) WHERE user_id=?`,
      [name||null, email||null, location_lat||null, location_lng||null, location_name||null, trade||null, bio||null, req.user.user_id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required.' });
    if (new_password.length < 10) return res.status(400).json({ error: 'New password must be at least 10 characters.' });
    const [rows] = await db.query('SELECT password FROM users WHERE user_id=?', [req.user.user_id]);
    const ok = await bcrypt.compare(current_password, rows[0].password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password=? WHERE user_id=?', [hashed, req.user.user_id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
    const [rows] = await db.query('SELECT profile_pic FROM users WHERE user_id=?', [req.user.user_id]);
    if (rows[0].profile_pic && rows[0].profile_pic !== 'default.png') {
      const old = path.join(UPLOAD_DIR, rows[0].profile_pic);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await db.query('UPDATE users SET profile_pic=? WHERE user_id=?', [req.file.filename, req.user.user_id]);
    res.json({ profile_pic: req.file.filename });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/avatar', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT profile_pic FROM users WHERE user_id=?', [req.user.user_id]);
    if (rows[0].profile_pic && rows[0].profile_pic !== 'default.png') {
      const old = path.join(UPLOAD_DIR, rows[0].profile_pic);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await db.query("UPDATE users SET profile_pic='default.png' WHERE user_id=?", [req.user.user_id]);
    res.json({ profile_pic: 'default.png' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/stats', auth, async (req, res) => {
  try {
    const uid = req.user.user_id;
    if (req.user.role === 'client') {
      const [[r]] = await db.query(`
        SELECT
          COUNT(*) AS total_posted,
          SUM(status='open') AS open_jobs,
          SUM(status='assigned') AS assigned_jobs,
          SUM(status IN ('completed','confirmed','closed')) AS completed_jobs,
          SUM(payment_status='paid') AS paid_jobs,
          COALESCE(SUM(CASE WHEN payment_status='paid' THEN quoted_price ELSE 0 END),0) AS total_spent
        FROM jobs WHERE client_id=?`, [uid]);
      res.json(r);
    } else {
      const [[r]] = await db.query(`
        SELECT
          SUM(status='assigned')  AS active_jobs,
          SUM(status IN ('completed','confirmed','closed')) AS completed_jobs,
          SUM(status='completed') AS awaiting_confirm,
          COALESCE(SUM(CASE WHEN payment_status='paid' THEN quoted_price ELSE 0 END),0) AS total_earned
        FROM jobs WHERE assigned_artisan_id=?`, [uid]);
      const [[openCount]] = await db.query(`SELECT COUNT(*) AS open_jobs FROM jobs WHERE status='open'`);
      res.json({ ...r, open_jobs: openCount.open_jobs });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ARTISAN SEARCH (for clients) ────────────────────────────
app.get('/api/artisans', auth, role('client'), async (req, res) => {
  try {
    const { skill, lat, lng } = req.query;
    let sql = `SELECT u.user_id, u.name, u.phone, u.email, u.trade, u.bio, u.location_lat, u.location_lng,
                      u.location_name, u.profile_pic, u.verification_status, u.is_available,
                      COALESCE(c.verified_count,0) AS verified_credentials
               FROM users u
               LEFT JOIN (
                 SELECT artisan_id, COUNT(*) AS verified_count
                 FROM credentials
                 WHERE verified=1
                 GROUP BY artisan_id
               ) c ON c.artisan_id = u.user_id
               WHERE u.role='artisan' AND u.is_available=1`;
    const params = [];
    if (skill && skill !== 'all') { sql += ' AND u.trade=?'; params.push(skill); }
    const [artisans] = await db.query(sql, params);
    if (lat && lng) {
      for (const a of artisans) {
        if (a.location_lat && a.location_lng) {
          a.distance_km = +haversine(+lat, +lng, +a.location_lat, +a.location_lng).toFixed(2);
        }
      }
      artisans.sort((a, b) => (a.distance_km||999) - (b.distance_km||999));
    }
    res.json(artisans);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/artisans/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id,name,phone,email,trade,bio,location_lat,location_lng,location_name,profile_pic,verification_status,created_at
       FROM users WHERE user_id=? AND role='artisan'`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Artisan not found.' });
    const [creds] = await db.query('SELECT * FROM credentials WHERE artisan_id=?', [req.params.id]);
    const [[stats]] = await db.query(`
      SELECT SUM(status IN ('confirmed','closed')) AS jobs_done,
             COALESCE(SUM(CASE WHEN payment_status='paid' THEN quoted_price ELSE 0 END),0) AS earned
      FROM jobs WHERE assigned_artisan_id=?`, [req.params.id]);
    res.json({ ...rows[0], credentials: creds, stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CREDENTIALS ─────────────────────────────────────────────
app.get('/api/credentials', auth, role('artisan'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM credentials WHERE artisan_id=? ORDER BY created_at DESC', [req.user.user_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/credentials', auth, role('artisan'), async (req, res) => {
  try {
    const { issuing_authority, index_number, serial_number, exam_year, trade_specialization } = req.body;
    if (!issuing_authority || !index_number || !serial_number || !exam_year || !trade_specialization)
      return res.status(400).json({ error: 'All credential fields are required.' });

    const [match] = await db.query(
      `SELECT * FROM simulated_registry WHERE issuing_authority=? AND index_number=? AND serial_number=? AND exam_year=?`,
      [issuing_authority, index_number, serial_number, +exam_year]
    );
    const verified = match.length > 0 ? 1 : 0;

    const [dup] = await db.query('SELECT credential_id FROM credentials WHERE serial_number=?', [serial_number]);
    if (dup.length) return res.status(409).json({ error: 'Certificate serial number already registered.' });

    const [result] = await db.query(
      `INSERT INTO credentials (artisan_id,issuing_authority,index_number,serial_number,exam_year,trade_specialization,verified)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.user_id, issuing_authority, index_number, serial_number, +exam_year, trade_specialization, verified]
    );
    if (verified) {
      await db.query(`UPDATE users SET verification_status='verified', trade=? WHERE user_id=? AND verification_status!='verified'`,
        [trade_specialization, req.user.user_id]);
    }
    res.json({ credential_id: result.insertId, verified, message: verified ? '✅ Credential verified against registry!' : '⚠️ Credential saved but not found in registry.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/credentials/:id', auth, role('artisan'), async (req, res) => {
  try {
    await db.query('DELETE FROM credentials WHERE credential_id=? AND artisan_id=?', [req.params.id, req.user.user_id]);
    res.json({ message: 'Credential removed.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── JOBS ────────────────────────────────────────────────────
app.get('/api/jobs', auth, async (req, res) => {
  try {
    const { status, skill, mine } = req.query;
    let sql, params = [];

    if (req.user.role === 'client') {
      sql = `SELECT j.*, u.name AS artisan_name, u.phone AS artisan_phone, u.profile_pic AS artisan_pic,
                    u.verification_status AS artisan_vs, u.trade AS artisan_trade
             FROM jobs j LEFT JOIN users u ON j.assigned_artisan_id=u.user_id
             WHERE j.client_id=?`;
      params = [req.user.user_id];
      if (status && status !== 'all') { sql += ' AND j.status=?'; params.push(status); }
    } else {
      if (mine === '1') {
        sql = `SELECT j.*, u.name AS client_name, u.phone AS client_phone, u.profile_pic AS client_pic
               FROM jobs j JOIN users u ON j.client_id=u.user_id
               WHERE j.assigned_artisan_id=?`;
        params = [req.user.user_id];
        if (status && status !== 'all') { sql += ' AND j.status=?'; params.push(status); }
      } else {
        sql = `SELECT j.*, u.name AS client_name, u.profile_pic AS client_pic
               FROM jobs j JOIN users u ON j.client_id=u.user_id
               WHERE j.status='open' AND u.is_available = 1`;
        if (skill && skill !== 'all') { sql += ' AND j.required_skill=?'; params.push(skill); }
      }
    }
    sql += ' ORDER BY j.is_emergency DESC, j.created_at DESC';
    const [rows] = await db.query(sql, params);

    if (req.user.role === 'artisan' && req.query.lat && req.query.lng) {
      for (const j of rows) {
        j.distance_km = +haversine(+req.query.lat, +req.query.lng, +j.job_location_lat, +j.job_location_lng).toFixed(2);
      }
      rows.sort((a, b) => (a.distance_km||999) - (b.distance_km||999));
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs', auth, role('client'), async (req, res) => {
  try {
    const { job_title, job_description, required_skill, job_location_lat, job_location_lng, job_location_name, budget_min, budget_max, is_emergency } = req.body;
    if (!job_title || !job_description || !required_skill || !job_location_lat || !job_location_lng)
      return res.status(400).json({ error: 'Title, description, skill and location are required.' });
    const [result] = await db.query(
      `INSERT INTO jobs (client_id,job_title,job_description,required_skill,job_location_lat,job_location_lng,job_location_name,budget_min,budget_max,is_emergency)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.user.user_id, job_title, job_description, required_skill, +job_location_lat, +job_location_lng, job_location_name||null, +(budget_min||0), +(budget_max||0), is_emergency ? 1 : 0]
    );
    res.json({ job_id: result.insertId, message: 'Job posted successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*,
              c.name AS client_name, c.phone AS client_phone, c.profile_pic AS client_pic, c.location_lat AS client_lat, c.location_lng AS client_lng,
              a.name AS artisan_name, a.phone AS artisan_phone, a.profile_pic AS artisan_pic, a.trade AS artisan_trade, a.verification_status AS artisan_vs,
              a.location_lat AS artisan_lat, a.location_lng AS artisan_lng
       FROM jobs j
       JOIN users c ON j.client_id=c.user_id
       LEFT JOIN users a ON j.assigned_artisan_id=a.user_id
       WHERE j.job_id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// UPDATED: Accept job with trade & verification check
app.put('/api/jobs/:id/accept', auth, role('artisan'), async (req, res) => {
  try {
    const [jobRows] = await db.query('SELECT * FROM jobs WHERE job_id=?', [req.params.id]);
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found.' });
    const job = jobRows[0];
    if (job.status !== 'open') return res.status(400).json({ error: 'Job is no longer available.' });

    const [artisanRows] = await db.query('SELECT trade, verification_status FROM users WHERE user_id=? AND role="artisan"', [req.user.user_id]);
    if (!artisanRows.length) return res.status(403).json({ error: 'Artisan account not found.' });
    const artisan = artisanRows[0];

    if (artisan.trade !== job.required_skill) {
      return res.status(400).json({ error: `Cannot accept – job requires "${job.required_skill}", but you are a "${artisan.trade}".` });
    }
    if (artisan.verification_status !== 'verified') {
      return res.status(400).json({ error: 'You must be verified in your trade to accept jobs. Upload your credentials first.' });
    }

    await db.query('UPDATE jobs SET assigned_artisan_id=?, status="assigned" WHERE job_id=?', [req.user.user_id, req.params.id]);
    await db.query(
      'INSERT INTO notifications (user_id, message, type, related_job_id) VALUES (?,?,?,?)',
      [job.client_id, `${req.user.name} has accepted your job: "${job.job_title}".`, 'job_accepted', job.job_id]
    );
    res.json({ message: 'Job accepted!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/jobs/:id/complete', auth, role('artisan'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=? AND assigned_artisan_id=?', [req.params.id, req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'assigned') return res.status(400).json({ error: 'Job must be assigned before marking complete.' });
    const [artisanRows] = await db.query('SELECT verification_status FROM users WHERE user_id=? AND role="artisan"', [req.user.user_id]);
    if (!artisanRows.length || artisanRows[0].verification_status !== 'verified') {
      return res.status(400).json({ error: 'Your artisan account must be verified before completing jobs.' });
    }
    await db.query("UPDATE jobs SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE job_id=?", [req.params.id]);
    await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
      [rows[0].client_id, `${req.user.name} has marked "${rows[0].job_title}" as complete. Please confirm.`, 'job_completed', rows[0].job_id]);
    res.json({ message: 'Job marked as complete. Awaiting client confirmation.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/jobs/:id/confirm', auth, role('client'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=? AND client_id=?', [req.params.id, req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'completed') return res.status(400).json({ error: 'Job must be marked complete by artisan first.' });
    await db.query("UPDATE jobs SET status='confirmed' WHERE job_id=?", [req.params.id]);
    if (rows[0].assigned_artisan_id) {
      await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
        [rows[0].assigned_artisan_id, `${req.user.name} confirmed job "${rows[0].job_title}" is done. Please quote your price.`, 'job_confirmed', rows[0].job_id]);
    }
    res.json({ message: 'Job confirmed!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/jobs/:id/quote', auth, role('artisan'), async (req, res) => {
  try {
    const { quoted_price } = req.body;
    if (!quoted_price || isNaN(+quoted_price)) return res.status(400).json({ error: 'Valid price required.' });
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=? AND assigned_artisan_id=?', [req.params.id, req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'confirmed') return res.status(400).json({ error: 'Job must be confirmed before quoting.' });
    const [artisanRows] = await db.query('SELECT verification_status FROM users WHERE user_id=? AND role="artisan"', [req.user.user_id]);
    if (!artisanRows.length || artisanRows[0].verification_status !== 'verified') {
      return res.status(400).json({ error: 'Your artisan account must be verified to submit a quote.' });
    }
    if (+quoted_price > +rows[0].budget_max) return res.status(400).json({ error: 'Quoted price cannot exceed the client\'s budget maximum.' });
    await db.query('UPDATE jobs SET quoted_price=? WHERE job_id=?', [+quoted_price, req.params.id]);
    await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
      [rows[0].client_id, `${req.user.name} quoted KES ${(+quoted_price).toLocaleString()} for "${rows[0].job_title}".`, 'job_quoted', rows[0].job_id]);
    res.json({ message: 'Price quoted.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/jobs/:id/dispute', auth, role('client'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=? AND client_id=?', [req.params.id, req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'completed') return res.status(400).json({ error: 'Only completed jobs can be disputed.' });
    await db.query("UPDATE jobs SET status='disputed' WHERE job_id=?", [req.params.id]);
    if (rows[0].assigned_artisan_id) {
      await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
        [rows[0].assigned_artisan_id, `${req.user.name} raised a dispute for "${rows[0].job_title}".`, 'job_disputed', rows[0].job_id]);
    }
    res.json({ message: 'Dispute raised and artisan notified.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/jobs/:id/payment', auth, role('artisan'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=? AND assigned_artisan_id=?', [req.params.id, req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'confirmed') return res.status(400).json({ error: 'Payment can only be recorded after the job is confirmed and quoted.' });
    if (rows[0].payment_status === 'paid') return res.status(400).json({ error: 'Payment is already recorded for this job.' });
    if (!rows[0].quoted_price) return res.status(400).json({ error: 'Please quote a price before marking payment.' });
    const [[setting]] = await db.query('SELECT setting_value FROM admin_settings WHERE setting_key=?', ['commission_percent']);
    const commissionPercent = setting && setting.setting_value ? parseFloat(setting.setting_value) : 5;
    const platformFee = parseFloat(((rows[0].quoted_price || 0) * commissionPercent / 100).toFixed(2));
    await db.query("UPDATE jobs SET payment_status='paid', status='closed', platform_fee=? WHERE job_id=?", [platformFee, req.params.id]);
    await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
      [rows[0].client_id, `Payment of KES ${(+rows[0].quoted_price).toLocaleString()} received for "${rows[0].job_title}". Job closed.`, 'payment_received', rows[0].job_id]);
    res.json({ message: 'Payment marked. Job closed.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/jobs/:id', auth, role('client'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=? AND client_id=?', [req.params.id, req.user.user_id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'open') return res.status(400).json({ error: 'Only open jobs can be deleted.' });
    await db.query('DELETE FROM jobs WHERE job_id=?', [req.params.id]);
    res.json({ message: 'Job deleted.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── NOTIFICATIONS ───────────────────────────────────────────
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
      [req.user.user_id]);
    const [[{ unread }]] = await db.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id=? AND is_read=0', [req.user.user_id]);
    res.json({ notifications: rows, unread });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.user_id]);
    res.json({ message: 'All marked as read.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const [result] = await db.query('UPDATE notifications SET is_read=1 WHERE notification_id=? AND user_id=?', [req.params.id, req.user.user_id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification marked as read.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/request-review', auth, role('artisan'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Review message is required.' });
    const [admins] = await db.query('SELECT user_id FROM users WHERE role="admin"');
    if (!admins.length) return res.status(500).json({ error: 'No admin users available.' });
    const stmt = 'INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,NULL)';
    await Promise.all(admins.map(admin => db.query(stmt, [admin.user_id, `Manual review requested by ${req.user.name}: ${message}`, 'manual_review'])));
    res.json({ message: 'Review request sent to admin.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN ROUTES ───────────────────────────────────────────
app.get('/api/admin/dashboard', auth, role('admin'), async (req, res) => {
  try {
    const [[usersCount]] = await db.query('SELECT COUNT(*) AS total_users FROM users');
    const [[jobsCount]]  = await db.query('SELECT COUNT(*) AS total_jobs FROM jobs');
    const [[pending]]    = await db.query("SELECT COUNT(*) AS pending_verifications FROM users WHERE verification_status='pending'");
    res.json({
      total_users: usersCount.total_users,
      total_jobs: jobsCount.total_jobs,
      pending_verifications: pending.pending_verifications
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id,name,phone,email,role,location_name,trade,verification_status,warning_count,is_suspended,created_at
       FROM users WHERE role!=? ORDER BY created_at DESC`,
      ['admin']
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function logAdminAction(adminId, action, targetType, targetId, details) {
  try {
    await db.query(
      'INSERT INTO audit_log (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
      [adminId, action, targetType, targetId, details]
    );
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

app.get('/api/admin/financial-stats', auth, role('admin'), async (req, res) => {
  try {
    const { start, end } = req.query;
    let filter = '1=1';
    const params = [];
    if (start) {
      filter += ' AND DATE(created_at) >= ?';
      params.push(start);
    }
    if (end) {
      filter += ' AND DATE(created_at) <= ?';
      params.push(end);
    }
    const [[stats]] = await db.query(
      `SELECT
         IFNULL(SUM(CASE WHEN payment_status='paid' THEN quoted_price ELSE 0 END),0) AS total_client_spending,
         IFNULL(SUM(CASE WHEN payment_status='paid' THEN platform_fee ELSE 0 END),0) AS total_platform_fee,
         IFNULL(SUM(CASE WHEN payment_status='paid' THEN quoted_price-platform_fee ELSE 0 END),0) AS total_artisan_earnings,
         IFNULL(AVG(CASE WHEN payment_status='paid' THEN quoted_price END),0) AS average_job_value,
         SUM(payment_status='paid') AS total_jobs_paid,
         SUM(status='disputed') AS total_jobs_disputed,
         IFNULL(SUM(CASE WHEN status='disputed' THEN quoted_price ELSE 0 END),0) AS disputed_amount
       FROM jobs WHERE ${filter}`,
      params
    );
    res.json({
      total_artisan_earnings: parseFloat(stats.total_artisan_earnings || 0),
      total_client_spending: parseFloat(stats.total_client_spending || 0),
      total_platform_fee: parseFloat(stats.total_platform_fee || 0),
      disputed_amount: parseFloat(stats.disputed_amount || 0),
      average_job_value: parseFloat(stats.average_job_value || 0),
      total_jobs_paid: stats.total_jobs_paid || 0,
      total_jobs_disputed: stats.total_jobs_disputed || 0
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/user-stats', auth, role('admin'), async (req, res) => {
  try {
    const [[counts]] = await db.query(
      `SELECT
         SUM(role='artisan') AS total_artisans,
         SUM(role='client') AS total_clients,
         SUM(role='artisan' AND verification_status='verified') AS verified_artisans,
         SUM(role='artisan' AND verification_status='pending') AS pending_artisans
       FROM users`
    );

    const [[lowRating]] = await db.query(
      `SELECT COUNT(*) AS count FROM (
         SELECT r.rated_user_id
         FROM ratings r
         JOIN users u ON r.rated_user_id = u.user_id
         WHERE u.role='artisan'
         GROUP BY r.rated_user_id
         HAVING AVG(r.rating) < 3
       ) t`
    );

    const [[clientStats]] = await db.query(
      `SELECT
         COUNT(*) AS total_clients,
         SUM(client_dispute_ratio > 0.2) AS clients_with_high_dispute_rate
       FROM (
         SELECT u.user_id,
           IFNULL(SUM(j.status='disputed') / NULLIF(COUNT(j.job_id),0),0) AS client_dispute_ratio
         FROM users u
         LEFT JOIN jobs j ON j.client_id = u.user_id
         WHERE u.role='client'
         GROUP BY u.user_id
       ) t`
    );

    const percentage = clientStats.total_clients > 0
      ? parseFloat(((clientStats.clients_with_high_dispute_rate / clientStats.total_clients) * 100).toFixed(1))
      : 0;

    res.json({
      total_artisans: counts.total_artisans || 0,
      total_clients: counts.total_clients || 0,
      verified_artisans: counts.verified_artisans || 0,
      pending_artisans: counts.pending_artisans || 0,
      artisans_with_low_rating: lowRating.count || 0,
      clients_with_high_dispute_rate: percentage
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/dispute-stats', auth, role('admin'), async (req, res) => {
  try {
    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) AS total_disputes_raised,
         SUM(dispute_resolved_favor IS NOT NULL) AS total_disputes_resolved,
         SUM(dispute_resolved_favor='client') AS disputes_favor_client,
         SUM(dispute_resolved_favor='artisan') AS disputes_favor_artisan,
         SUM(status='disputed') AS pending_disputes
       FROM jobs`
    );
    res.json({
      total_disputes_raised: stats.total_disputes_raised || 0,
      total_disputes_resolved: stats.total_disputes_resolved || 0,
      disputes_favor_client: stats.disputes_favor_client || 0,
      disputes_favor_artisan: stats.disputes_favor_artisan || 0,
      pending_disputes: stats.pending_disputes || 0
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/job-activity', auth, role('admin'), async (req, res) => {
  try {
    const [hourRows] = await db.query(
      `SELECT HOUR(completed_at) AS hour, COUNT(*) AS count
       FROM jobs
       WHERE completed_at IS NOT NULL
       GROUP BY hour`
    );
    const [weekdayRows] = await db.query(
      `SELECT DAYOFWEEK(completed_at)-1 AS weekday, COUNT(*) AS count
       FROM jobs
       WHERE completed_at IS NOT NULL
       GROUP BY weekday`
    );
    const [[monthRow]] = await db.query(
      `SELECT DATE_FORMAT(completed_at, '%M') AS month, COUNT(*) AS count
       FROM jobs
       WHERE completed_at IS NOT NULL
       GROUP BY month
       ORDER BY count DESC
       LIMIT 1`
    );

    const hours = Array(24).fill(0);
    hourRows.forEach(row => { hours[row.hour] = row.count; });
    const weekdays = Array(7).fill(0);
    weekdayRows.forEach(row => { weekdays[row.weekday] = row.count; });

    res.json({
      jobs_completed_by_hour: hours,
      jobs_completed_by_weekday: weekdays,
      most_active_month: monthRow ? { month: monthRow.month, count: monthRow.count } : { month: null, count: 0 }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/jobs/:id/delete', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT job_id, job_title FROM jobs WHERE job_id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    await db.query('DELETE FROM jobs WHERE job_id=?', [req.params.id]);
    await logAdminAction(req.user.user_id, 'delete_job', 'job', req.params.id, `Deleted job ${rows[0].job_title}`);
    res.json({ message: 'Job deleted.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users/:id/warning', auth, role('admin'), async (req, res) => {
  try {
    const { message } = req.body;
    const [rows] = await db.query('SELECT user_id, name, role FROM users WHERE user_id=? AND role!=?', [req.params.id, 'admin']);
    if (!rows.length) return res.status(404).json({ error: 'User not found or not eligible.' });
    await db.query('UPDATE users SET warning_count = warning_count + 1 WHERE user_id=?', [req.params.id]);
    const warningMessage = message && message.trim().length ? message.trim() : 'A warning has been issued on your account. Please review your activity.';
    await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,NULL)', [req.params.id, warningMessage, 'admin_warning']);
    await logAdminAction(req.user.user_id, 'send_warning', 'user', req.params.id, warningMessage);
    res.json({ message: 'Warning issued and recorded.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/audit-log', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.name AS admin_name
       FROM audit_log a
       LEFT JOIN users u ON a.admin_id = u.user_id
       ORDER BY a.created_at DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/flagged-jobs', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.job_id, j.job_title, j.status, j.quoted_price, j.flagged, j.created_at,
              u1.name AS client_name, u2.name AS artisan_name
       FROM jobs j
       LEFT JOIN users u1 ON j.client_id=u1.user_id
       LEFT JOIN users u2 ON j.assigned_artisan_id=u2.user_id
       WHERE j.flagged=1
       ORDER BY j.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/jobs/:id/unflag', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT job_id, job_title FROM jobs WHERE job_id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    await db.query('UPDATE jobs SET flagged=0 WHERE job_id=?', [req.params.id]);
    await logAdminAction(req.user.user_id, 'unflag_job', 'job', req.params.id, `Unflagged job ${rows[0].job_title}`);
    res.json({ message: 'Job unflagged.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/financial-settings', auth, role('admin'), async (req, res) => {
  try {
    const [[setting]] = await db.query('SELECT setting_value FROM admin_settings WHERE setting_key=?', ['commission_percent']);
    res.json({ commission_percent: setting ? setting.setting_value : '5' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/financial-settings', auth, role('admin'), async (req, res) => {
  try {
    const { commission_percent } = req.body;
    const percent = parseFloat(commission_percent);
    if (isNaN(percent) || percent < 0) return res.status(400).json({ error: 'Invalid commission percent.' });
    await db.query('INSERT INTO admin_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?', ['commission_percent', percent.toString(), percent.toString()]);
    res.json({ message: 'Commission setting updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users-with-warnings', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id,name,phone,email,role,warning_count
       FROM users
       WHERE role!=? AND warning_count > 0
       ORDER BY warning_count DESC, created_at DESC`,
      ['admin']
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/credentials', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS artisan_name, u.phone AS artisan_phone
       FROM credentials c
       JOIN users u ON c.artisan_id=u.user_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/verify', auth, role('admin'), async (req, res) => {
  try {
    const { verification_status } = req.body;
    if (!['verified','rejected','pending'].includes(verification_status)) {
      return res.status(400).json({ error: 'Invalid verification status.' });
    }
    const [rows] = await db.query('SELECT user_id FROM users WHERE user_id=? AND role!=?', [req.params.id, 'admin']);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    await db.query('UPDATE users SET verification_status=? WHERE user_id=?', [verification_status, req.params.id]);
    res.json({ message: 'Verification status updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, role FROM users WHERE user_id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    if (rows[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete another admin.' });
    await db.query('DELETE FROM users WHERE user_id=?', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/jobs/:id/resolve', auth, role('admin'), async (req, res) => {
  try {
    const { favor } = req.body;
    if (!['client','artisan'].includes(favor)) return res.status(400).json({ error: 'Invalid resolution favor.' });
    const [rows] = await db.query('SELECT * FROM jobs WHERE job_id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    if (rows[0].status !== 'disputed') return res.status(400).json({ error: 'Job must be disputed to resolve.' });
    await db.query("UPDATE jobs SET status='closed', dispute_resolved_favor=? WHERE job_id=?", [favor, req.params.id]);
    if (rows[0].assigned_artisan_id) {
      await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
        [rows[0].assigned_artisan_id, `Admin resolved dispute for "${rows[0].job_title}" in favor of ${favor}.`, 'dispute_resolved', rows[0].job_id]);
    }
    await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
      [rows[0].client_id, `Admin resolved dispute for "${rows[0].job_title}" in favor of ${favor}.`, 'dispute_resolved', rows[0].job_id]);
    res.json({ message: 'Dispute resolved. Job closed.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RATINGS ─────────────────────────────────────────────────
app.post('/api/jobs/:id/rate', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5 stars.' });
    
    const [job] = await db.query('SELECT * FROM jobs WHERE job_id=?', [req.params.id]);
    if (!job.length) return res.status(404).json({ error: 'Job not found.' });
    if (job[0].status !== 'closed' && job[0].status !== 'confirmed') return res.status(400).json({ error: 'Cannot rate jobs not yet completed.' });
    
    const isClient = req.user.user_id === job[0].client_id;
    const isArtisan = req.user.user_id === job[0].assigned_artisan_id;
    if (!isClient && !isArtisan) return res.status(403).json({ error: 'Only client or assigned artisan can rate.' });
    
    const ratedUserId = isClient ? job[0].assigned_artisan_id : job[0].client_id;
    if (!ratedUserId) return res.status(400).json({ error: 'Cannot rate unassigned job.' });
    
    const [existing] = await db.query(
      'SELECT rating_id FROM ratings WHERE job_id=? AND rater_id=?',
      [req.params.id, req.user.user_id]
    );
    
    if (existing.length) {
      await db.query('UPDATE ratings SET rating=?, comment=? WHERE job_id=? AND rater_id=?',
        [rating, comment || null, req.params.id, req.user.user_id]);
    } else {
      await db.query(
        'INSERT INTO ratings (job_id, rater_id, rated_user_id, rating, comment) VALUES (?,?,?,?,?)',
        [req.params.id, req.user.user_id, ratedUserId, rating, comment || null]
      );
    }
    
    res.json({ message: 'Rating submitted successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id/ratings', auth, async (req, res) => {
  try {
    const [ratings] = await db.query(
      `SELECT r.*, u.name AS rater_name, u.profile_pic
       FROM ratings r
       JOIN users u ON r.rater_id=u.user_id
       WHERE r.rated_user_id=?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    const [[stats]] = await db.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_ratings FROM ratings WHERE rated_user_id=?',
      [req.params.id]
    );
    res.json({ ratings, stats: { avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : 0, total_ratings: stats.total_ratings } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/disputes', auth, role('admin'), async (req, res) => {
  try {
    const [jobs] = await db.query(`
      SELECT j.*, 
        u1.name as client_name, u1.phone as client_phone,
        u2.name as artisan_name, u2.phone as artisan_phone
      FROM jobs j
      JOIN users u1 ON j.client_id = u1.user_id
      LEFT JOIN users u2 ON j.assigned_artisan_id = u2.user_id
      WHERE j.status = 'disputed'`
    );
    res.json(jobs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs/:id/concern', auth, role('artisan'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length < 5) return res.status(400).json({ error: 'Concern message must be at least 5 characters.' });
    
    const [job] = await db.query('SELECT * FROM jobs WHERE job_id=? AND assigned_artisan_id=?', [req.params.id, req.user.user_id]);
    if (!job.length) return res.status(404).json({ error: 'Job not found or not assigned to you.' });
    if (job[0].status !== 'disputed') return res.status(400).json({ error: 'Job must be disputed to raise a concern.' });
    
    await db.query('INSERT INTO dispute_responses (job_id, responder_id, message) VALUES (?,?,?)',
      [req.params.id, req.user.user_id, message]);
    
    await db.query('INSERT INTO notifications (user_id,message,type,related_job_id) VALUES (?,?,?,?)',
      [1, `Artisan ${req.user.name} raised a concern on disputed job "${job[0].job_title}".`, 'dispute_concern', req.params.id]);
    
    res.json({ message: 'Concern submitted. Admin will review.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs/:id/concerns', auth, async (req, res) => {
  try {
    const [responses] = await db.query(`
      SELECT r.*, u.name, u.profile_pic FROM dispute_responses r
      JOIN users u ON r.responder_id=u.user_id
      WHERE r.job_id=? ORDER BY r.created_at DESC`, [req.params.id]
    );
    res.json(responses);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ARTISAN AVAILABILITY ────────────────────────────────────
app.put('/api/users/availability', auth, role('artisan'), async (req, res) => {
  try {
    const { is_available } = req.body;
    await db.query('UPDATE users SET is_available=? WHERE user_id=?', [is_available ? 1 : 0, req.user.user_id]);
    res.json({ message: `Availability set to ${is_available ? 'available' : 'busy'}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CHART DATA FOR DASHBOARDS ───────────────────────────────
app.get('/api/users/chart-data', auth, async (req, res) => {
  try {
    const userId = req.user.user_id;
    if (req.user.role === 'client') {
      const [rows] = await db.query(
        `SELECT required_skill, COUNT(*) as count FROM jobs WHERE client_id=? GROUP BY required_skill ORDER BY count DESC`,
        [userId]
      );
      res.json({ type: 'client', data: rows });
    } else if (req.user.role === 'artisan') {
      const [rows] = await db.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(quoted_price) as total
         FROM jobs WHERE assigned_artisan_id=? AND payment_status='paid' 
         GROUP BY month ORDER BY month DESC LIMIT 12`,
        [userId]
      );
      res.json({ type: 'artisan', data: rows });
    } else {
      res.json({ type: 'admin', data: [] });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── AI SKILL RECOMMENDATIONS ────────────────────────────────
app.get('/api/artisans/recommendations', auth, role('artisan'), async (req, res) => {
  try {
    const artisanId = req.user.user_id;
    const [[artisan]] = await db.query('SELECT location_lat, location_lng FROM users WHERE user_id=?', [artisanId]);
    if (!artisan || artisan.location_lat == null || artisan.location_lng == null) return res.json([]);
    
    const [rows] = await db.query(`
      SELECT required_skill, COUNT(*) as count
      FROM jobs
      WHERE status='open'
        AND (6371 * acos(cos(radians(?)) * cos(radians(job_location_lat)) * cos(radians(job_location_lng) - radians(?)) + sin(radians(?)) * sin(radians(job_location_lat)))) <= 10
      GROUP BY required_skill
      ORDER BY count DESC
      LIMIT 3
    `, [artisan.location_lat, artisan.location_lng, artisan.location_lat]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: JOBS BY AREA (County Distribution) ───────────────
app.get('/api/admin/jobs-by-area', auth, role('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        CASE 
          WHEN job_location_name LIKE '%Westlands%' THEN 'Westlands'
          WHEN job_location_name LIKE '%Kilimani%' THEN 'Kilimani'
          WHEN job_location_name LIKE '%Embakasi%' THEN 'Embakasi'
          WHEN job_location_name LIKE '%Karen%' THEN 'Karen'
          WHEN job_location_name LIKE '%Kasarani%' THEN 'Kasarani'
          WHEN job_location_name LIKE '%CBD%' THEN 'CBD'
          WHEN job_location_name LIKE '%Nairobi CBD%' THEN 'CBD'
          WHEN job_location_name LIKE '%Northlands%' THEN 'Northlands'
          WHEN job_location_name LIKE '%Ngong%' THEN 'Ngong'
          WHEN job_location_name LIKE '%Langata%' THEN 'Langata'
          ELSE 'Other'
        END as area,
        COUNT(*) as count
      FROM jobs
      WHERE status!='disputed'
      GROUP BY area
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE OWN ACCOUNT ─────────────────────────────────────
app.delete('/api/users/me', auth, async (req, res) => {
  try {
    const userId = req.user.user_id;
    await db.query('DELETE FROM users WHERE user_id = ?', [userId]);
    res.json({ message: 'Account deleted successfully.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Catch-all → login ──────────────────────────────────────
app.use((_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`✅ SkillLink running at http://localhost:${PORT}`));