import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/submit', async (req, res) => {
  try {
    const { teamId, eventId } = req.body;

    if (!teamId || !eventId) {
      return res.status(400).json({ success: false, error: 'teamId and eventId are required.' });
    }

    // Mark the submission as SUBMITTED in the database
    const { data, error } = await supabase
      .from('submissions')
      .update({ status: 'SUBMITTED' })
      .eq('team_id', teamId)
      .eq('event_id', eventId);

    if (error) {
      console.error('[Route] Submit error:', error);
      return res.status(500).json({ success: false, error: `Database error: ${error.message} ${error.details || ''}`.trim() });
    }

    res.json({ success: true, message: 'Submission successful' });

  } catch (err) {
    console.error('[Route] Submit caught error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to submit.' });
  }
});

export default router;
