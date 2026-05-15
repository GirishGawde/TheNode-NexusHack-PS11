import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('submissions')
    .update({ status: 'SUBMITTED' })
    .eq('team_id', 'dummy-team')
    .eq('event_id', 'dummy-event');
  
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
