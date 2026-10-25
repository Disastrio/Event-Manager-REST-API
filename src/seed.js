'use strict';

/**
 * Idempotent seed script.
 *   npm run seed
 *
 * - Creates an admin account from ADMIN_* env vars if it does not exist.
 * - Optionally resets that admin's password when SEED_RESET_ADMIN_PASSWORD=true.
 * - Optionally creates sample events when SEED_SAMPLE_DATA=true and the
 *   events collection is empty.
 *
 * Safe to run repeatedly; it never duplicates data. The exported `seed()`
 * function is reused by the smoke/test tooling; running the file directly
 * connects, seeds and disconnects.
 */

const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const Event = require('./models/Event');

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY);
}

const SAMPLE_EVENTS = [
  {
    title: 'Annual Hackathon 2026',
    description: 'A 24-hour hackathon for students across all departments. Teams of up to four.',
    category: 'Technology',
    location: 'Main Auditorium, Block A',
    startDate: daysFromNow(20),
    endDate: daysFromNow(21),
    capacity: 200,
  },
  {
    title: 'Inter-College Football Cup',
    description: 'Knockout football tournament between departments. Register your squad today.',
    category: 'Sports',
    location: 'University Sports Ground',
    startDate: daysFromNow(12),
    endDate: daysFromNow(12.25),
    capacity: 120,
  },
  {
    title: 'Cultural Night: Rhythms of India',
    description: 'An evening of dance, music and drama performed by student clubs.',
    category: 'Cultural',
    location: 'Open Air Theatre',
    startDate: daysFromNow(30),
    endDate: daysFromNow(30.25),
    capacity: 500,
  },
  {
    title: 'Resume & Interview Workshop',
    description: 'Hands-on workshop on building a strong resume and acing technical interviews.',
    category: 'Career',
    location: 'Seminar Hall, Block C',
    startDate: daysFromNow(7),
    endDate: daysFromNow(7.1),
    capacity: 80,
  },
  {
    title: 'Intro to Cloud Computing',
    description: 'Beginner-friendly session covering AWS core services and deployment basics.',
    category: 'Workshop',
    location: 'Computer Lab 2',
    startDate: daysFromNow(15),
    endDate: daysFromNow(15.1),
    capacity: 60,
  },
];

/**
 * @param {{ connect?: boolean, disconnect?: boolean }} [options]
 */
async function seed(options = {}) {
  const { connect = true, disconnect = true } = options;

  if (connect) await connectDB();

  const { adminName, adminEmail, adminPassword, sampleData } = config.seed;
  const resetPassword = String(process.env.SEED_RESET_ADMIN_PASSWORD || 'false') === 'true';

  let admin = await User.findOne({ email: adminEmail.toLowerCase() }).select('+password');
  let adminCreated = false;

  if (!admin) {
    admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });
    adminCreated = true;
    // eslint-disable-next-line no-console
    console.log(`[seed] created admin ${adminEmail}`);
  } else {
    let changed = false;
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      changed = true;
    }
    if (resetPassword) {
      admin.password = adminPassword;
      changed = true;
    }
    if (changed) {
      await admin.save();
      // eslint-disable-next-line no-console
      console.log('[seed] updated existing admin account');
    } else {
      // eslint-disable-next-line no-console
      console.log('[seed] admin already exists, left unchanged');
    }
  }

  let sampleEventsCreated = 0;
  if (sampleData) {
    const existing = await Event.countDocuments();
    if (existing === 0) {
      await Event.insertMany(
        SAMPLE_EVENTS.map((event) => ({ ...event, organizer: admin._id, status: 'published' }))
      );
      sampleEventsCreated = SAMPLE_EVENTS.length;
      // eslint-disable-next-line no-console
      console.log(`[seed] created ${sampleEventsCreated} sample events`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed] ${existing} event(s) already exist, skipping sample data`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n[seed] done.');
  // eslint-disable-next-line no-console
  console.log(`  admin email: ${adminEmail}`);
  if (adminCreated) {
    // eslint-disable-next-line no-console
    console.log(`  admin password: ${adminPassword}`);
  } else if (resetPassword) {
    // eslint-disable-next-line no-console
    console.log('  admin password: reset to the value in ADMIN_PASSWORD');
  } else {
    // eslint-disable-next-line no-console
    console.log('  admin password: unchanged (set SEED_RESET_ADMIN_PASSWORD=true to reset)');
  }

  if (disconnect) await disconnectDB();

  return { admin, adminCreated, sampleEventsCreated, resetPassword };
}

if (require.main === module) {
  seed().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
}

module.exports = { seed, SAMPLE_EVENTS };
