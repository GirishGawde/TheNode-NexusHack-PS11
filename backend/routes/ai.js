import express from 'express';
import { suggestRubric } from '../services/ai/rubricGenerator.js';
import { analyzeJudgeFeedback } from '../services/ai/sentimentScorer.js';
import { suggestTeams } from '../services/ai/teamMatcher.js';

const router = express.Router();

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

router.post('/analyze-feedback', async (req, res) => {
  try {
    const { feedbackText, criteria } = req.body;
    const result = await analyzeJudgeFeedback(feedbackText, criteria);
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

export default router;
