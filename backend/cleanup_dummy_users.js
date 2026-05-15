import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanup() {
  console.log("Starting Dummy Data Cleanup...");

  // Fetch all dummy users (emails ending in @demo.com)
  const { data: dummyUsers, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .like('email', '%@demo.com');

  if (fetchError) {
    console.error("Error fetching dummy users:", fetchError);
    return;
  }

  if (!dummyUsers || dummyUsers.length === 0) {
    console.log("No dummy users found ending with @demo.com. Everything is clean!");
    return;
  }

  console.log(`Found ${dummyUsers.length} dummy users. Aggressively deleting them and all their linked data...`);

  for (const user of dummyUsers) {
    const userId = user.id;
    console.log(`\nCleaning up user: ${user.email}`);

    // 1. Find teams they lead
    const { data: teams } = await supabaseAdmin.from('teams').select('id').eq('leader_id', userId);
    
    if (teams && teams.length > 0) {
      for (const team of teams) {
        // Delete submissions
        await supabaseAdmin.from('submissions').delete().eq('team_id', team.id);
        // Delete team members
        await supabaseAdmin.from('team_members').delete().eq('team_id', team.id);
        // Delete team messages
        await supabaseAdmin.from('team_messages').delete().eq('team_id', team.id);
        // Delete event registrations linked to this team
        await supabaseAdmin.from('event_registrations').delete().eq('team_id', team.id);
        // Delete the team itself
        await supabaseAdmin.from('teams').delete().eq('id', team.id);
        console.log(`  - Deleted team, submissions, and member data.`);
      }
    }

    // 2. Delete any remaining team memberships or event registrations where they are a participant
    await supabaseAdmin.from('team_members').delete().eq('user_id', userId);
    await supabaseAdmin.from('event_registrations').delete().eq('user_id', userId);

    // 3. Delete from public.users table
    await supabaseAdmin.from('users').delete().eq('id', userId);
    console.log(`  - Removed from public user records.`);

    // 4. Delete from auth.users (Core Supabase Auth)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error(`  - Failed to delete from Supabase Auth:`, authError.message);
    } else {
      console.log(`  - Successfully wiped from Supabase Auth.`);
    }
  }

  console.log("\n=============================================");
  console.log("Cleanup Complete! All dummy users and their teams have been permanently deleted.");
  console.log("=============================================");
}

cleanup();
