import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: events } = await supabase.from('events').select('id, name');
  console.log("EVENTS:", events);
  
  if (events && events.length > 0) {
    const eventId = events[0].id;
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, submissions(id, status)')
      .eq('event_id', eventId);
    console.log("TEAMS WITH SUBMISSIONS:", JSON.stringify(teams, null, 2));
  }
}

check().catch(console.error);
