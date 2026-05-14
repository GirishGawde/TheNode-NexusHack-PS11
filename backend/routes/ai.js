import express from 'express';
import { suggestRubric } from '../services/ai/rubricGenerator.js';
import { analyzeJudgeFeedback } from '../services/ai/sentimentScorer.js';
import { suggestTeams } from '../services/ai/teamMatcher.js';
import { checkDescriptionSimilarity } from '../services/ai/plagiarismTextChecker.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/suggest-rubric', async (req, res) => {
  try {
    const { eventName, tracks, description } = req.body;
    const result = await suggestRubric({ eventName, tracks, description });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Route] suggest-rubric error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate rubric' });
  }
});

router.post('/score-from-feedback', async (req, res) => {
  try {
    const { feedback, criteria } = req.body;
    const result = await analyzeJudgeFeedback(feedback, criteria);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Route] analyze-feedback error:', err);
    res.status(500).json({ success: false, error: 'Failed to analyze feedback' });
  }
});

router.post('/find-teams', async (req, res) => {
  try {
    const { soloParticipants, eventDetails } = req.body;
    const result = await suggestTeams(soloParticipants, eventDetails);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Route] find-teams error:', err);
    res.status(500).json({ success: false, error: 'Failed to suggest teams' });
  }
});

// POST /api/ai/check-plagiarism
// Checks a specific submission against all others in the event for plagiarism
router.post('/check-plagiarism', async (req, res) => {
  try {
    const { submissionId, eventId } = req.body;
    if (!submissionId || !eventId) {
      return res.status(400).json({ success: false, error: 'submissionId and eventId are required.' });
    }

    // Fetch all submissions for this event
    const { data: allSubmissions, error } = await supabase
      .from('submissions')
      .select('id, project_name, tagline, problem_statement')
      .eq('event_id', eventId);

    if (error) throw error;

    const target = allSubmissions.find(s => s.id === submissionId);
    if (!target) return res.status(404).json({ success: false, error: 'Submission not found.' });

    const result = await checkDescriptionSimilarity(target, allSubmissions);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Route] check-plagiarism error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to check plagiarism.' });
  }
});

export default router;
