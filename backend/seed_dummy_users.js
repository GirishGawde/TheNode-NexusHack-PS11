import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

/*
===========================================================================
  DUMMY DATA SCRIPT (USERS, TEAMS, SUBMISSIONS)
  
  Run this script once using: node seed_dummy_users.js

  CREDENTIALS FOR DEMO:
  --------------------------------------------------
  [ AI Matchmaking Demo Users ]
  1. alice@demo.com   | Password123! | Skills: React, Next.js, TailwindCSS
  2. bob@demo.com     | Password123! | Skills: Node.js, Express, PostgreSQL
  3. charlie@demo.com | Password123! | Skills: UI/UX, Figma
  4. dave@demo.com    | Password123! | Skills: Python, Machine Learning, AI

  [ Telegram Bot Demo User ]
  5. terry@demo.com   | Password123! | Note: Update his 'telegram_chat_id' in Supabase to your real chat ID!

  [ Judging Panel Demo Users (Team Leaders) ]
  6. team1@demo.com   | Password123! | Team: "Nexus Innovators"
  7. team2@demo.com   | Password123! | Team: "Code Crafters"
  8. team3@demo.com   | Password123! | Team: "Data Wizards"
  9. team4@demo.com   | Password123! | Team: "Cloud Surfers"
  10. team5@demo.com  | Password123! | Team: "Design Dynamos"
===========================================================================
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const dummyUsers = [
  // --- AI Matchmaking Users ---
  { name: "Alice (Frontend)", email: "alice@demo.com", password: "Password123!", skills: ["React", "Next.js", "TailwindCSS"] },
  { name: "Bob (Backend)", email: "bob@demo.com", password: "Password123!", skills: ["Node.js", "Express", "PostgreSQL"] },
  { name: "Charlie (Design)", email: "charlie@demo.com", password: "Password123!", skills: ["UI/UX", "Figma", "Graphic Design"] },
  { name: "Dave (AI/ML)", email: "dave@demo.com", password: "Password123!", skills: ["Python", "Machine Learning", "AI"] },
  
  // --- Telegram Tester ---
  { name: "Terry (Telegram)", email: "terry@demo.com", password: "Password123!", skills: ["Testing"], telegram_chat_id: "PUT_YOUR_REAL_CHAT_ID_HERE" },

  // --- Judging Panel Teams ---
  { name: "Leader 1", email: "team1@demo.com", password: "Password123!", skills: ["Fullstack"], teamName: "Nexus Innovators", project: "Smart AI Health Tracker" },
  { name: "Leader 2", email: "team2@demo.com", password: "Password123!", skills: ["Fullstack"], teamName: "Code Crafters", project: "Decentralized Voting App" },
  { name: "Leader 3", email: "team3@demo.com", password: "Password123!", skills: ["Fullstack"], teamName: "Data Wizards", project: "Real-time Traffic Prediction" },
  { name: "Leader 4", email: "team4@demo.com", password: "Password123!", skills: ["Fullstack"], teamName: "Cloud Surfers", project: "Serverless E-commerce" },
  { name: "Leader 5", email: "team5@demo.com", password: "Password123!", skills: ["Fullstack"], teamName: "Design Dynamos", project: "Accessible Education Platform" }
];

async function seedDatabase() {
  console.log("Starting Dummy Data Injection...");

  // Try to find a valid event to attach teams and submissions to
  const { data: events } = await supabaseAdmin.from('events').select('id').limit(1);
  const eventId = events && events.length > 0 ? events[0].id : null;

  if (!eventId) {
    console.log("⚠️ No events found in the database. Teams and Submissions will NOT be created (Users will still be created).");
  } else {
    console.log(`Found Event ID: ${eventId}. Teams will be linked to this event.`);
  }

  for (const user of dummyUsers) {
    console.log(`\nProcessing ${user.name} (${user.email})...`);
    
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true 
    });

    let userId;
    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log(`User ${user.email} already exists in auth. Skipping creation to avoid duplicates.`);
        continue; // Skip the rest for this user to avoid duplicating teams
      } else {
        console.error(`Failed to create auth user:`, authError.message);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    // 2. Insert into public.users table
    await supabaseAdmin.from('users').upsert({
      id: userId,
      email: user.email,
      name: user.name,
      role: 'participant',
      skills: user.skills,
      telegram_chat_id: user.telegram_chat_id || null,
      opted_into_bot: !!user.telegram_chat_id
    });

    // 3. If this user is meant to lead a team, create the team and submission
    if (user.teamName && eventId) {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create Team
      const { data: teamData, error: teamError } = await supabaseAdmin.from('teams').insert({
        name: user.teamName,
        event_id: eventId,
        leader_id: userId,
        invite_code: inviteCode
      }).select('id').single();

      if (teamError) {
        console.error(`Failed to create team: ${teamError.message}`);
        continue;
      }

      // Add user to team_members
      await supabaseAdmin.from('team_members').insert({
        team_id: teamData.id,
        user_id: userId
      });

      // Register team for event
      await supabaseAdmin.from('event_registrations').insert({
        event_id: eventId,
        user_id: userId,
        team_id: teamData.id,
        is_solo: false
      });

      // Create dummy submission for the Judges to grade
      await supabaseAdmin.from('submissions').insert({
        team_id: teamData.id,
        event_id: eventId,
        project_name: user.project,
        tagline: "Built during the NexusHack Hackathon!",
        github_repo_url: "https://github.com/example/project",
        status: "SUBMITTED",
        submitted_at: new Date().toISOString()
      });

      console.log(`Created Team '${user.teamName}' and a project submission.`);
    }
  }

  console.log("\n=============================================");
  console.log("Done! You can now log in using the credentials in the script comments.");
  console.log("=============================================");
}

seedDatabase();
