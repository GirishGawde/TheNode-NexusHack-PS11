import { analyzeJudgeFeedback } from './services/ai/sentimentScorer.js';
import dotenv from 'dotenv';
dotenv.config();

const feedback = "Great problem statement, but the UI was clunky.";
const criteria = [
  { id: "123", name: "Problem Statement", description: "Is it a good problem?" },
  { id: "456", name: "UI/UX", description: "Does it look good?" }
];

analyzeJudgeFeedback(feedback, criteria).then(res => console.log("RESULT:", JSON.stringify(res, null, 2))).catch(console.error);
