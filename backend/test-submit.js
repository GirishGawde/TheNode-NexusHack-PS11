import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('submissions')
    .update({ status: 'SUBMITTED' })
    .eq('team_id', '238aacd4-e0ce-4f6b-b255-4efe075a1791')
    .eq('event_id', '4cec86c3-5ce1-490d-82b2-056c210361c0');
  
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
