import axios from 'axios';
import { supabase } from '../../config/supabase.js';

export function parseGithubUrl(url) {
  try {
    if (!url) return null;
    let cleanUrl = url.replace(/\/$/, '');
    cleanUrl = cleanUrl.replace(/\.git$/, '');
    
    let match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)$/i);
    if (match && match.length === 3) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch (err) {
    console.error('[Plagiarism] parseGithubUrl error:', err);
    return null;
  }
}

export async function checkCommitTimestamps(repoUrl, eventStartDate) {
  try {
    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) return { risk: 'GREEN', details: 'Invalid GitHub URL' };
    
    const { owner, repo } = parsed;
    const token = process.env.GITHUB_TOKEN;
    const headers = token ? { Authorization: `token ${token}` } : {};

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
      headers,
      params: { per_page: 100 }
    });

    const commits = response.data;
    const eventStart = new Date(eventStartDate);
    let preEventCommitCount = 0;

    commits.forEach(commit => {
      const commitDate = new Date(commit.commit.author.date);
      if (commitDate < eventStart) {
        preEventCommitCount++;
      }
    });

    const hasPreEventCommits = preEventCommitCount > 0;
    const risk = hasPreEventCommits ? (preEventCommitCount > 5 ? 'RED' : 'YELLOW') : 'GREEN';
    
    return {
      hasPreEventCommits,
      preEventCommitCount,
      totalCommits: commits.length,
      risk,
      details: hasPreEventCommits ? `Found ${preEventCommitCount} commits before event start date.` : 'No pre-event commits found.'
    };
  } catch (err) {
    console.error('[Plagiarism] checkCommitTimestamps error:', err.response?.status || err.message);
    if (err.response?.status === 404) return { risk: 'YELLOW', details: 'Private or non-existent repo' };
    if (err.response?.status === 403 || err.response?.status === 429) return { risk: 'YELLOW', details: 'Rate limited by GitHub API' };
    return { risk: 'YELLOW', details: 'Failed to fetch commits' };
  }
}

export async function checkIfFork(repoUrl) {
  try {
    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) return { risk: 'GREEN', details: 'Invalid GitHub URL' };
    
    const { owner, repo } = parsed;
    const token = process.env.GITHUB_TOKEN;
    const headers = token ? { Authorization: `token ${token}` } : {};

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    const isFork = response.data.fork;
    const parentRepo = isFork && response.data.parent ? response.data.parent.html_url : null;
    const risk = isFork ? 'RED' : 'GREEN';

    return {
      isFork,
      parentRepo,
      risk,
      details: isFork ? `Repository is a fork of ${parentRepo}` : 'Repository is not a fork'
    };
  } catch (err) {
    console.error('[Plagiarism] checkIfFork error:', err.response?.status || err.message);
    return { risk: 'YELLOW', details: 'Could not determine if fork' };
  }
}

export async function fullPlagiarismCheck(submission, event, allSubmissions) {
  try {
    // In actual implementation, we might also call plagiarismTextChecker.js here
    // However, I will dynamically import it later to avoid circular dependencies if any,
    // or assume text checker is another service called separately or combined here.
    // Assuming for now we just do GitHub checks as requested.
    
    const [commitCheck, forkCheck] = await Promise.all([
      checkCommitTimestamps(submission.github_repo_url, event.start_date),
      checkIfFork(submission.github_repo_url)
    ]);

    // Determine highest risk (RED > YELLOW > GREEN)
    const risks = [commitCheck.risk, forkCheck.risk];
    let finalRisk = 'GREEN';
    if (risks.includes('RED')) finalRisk = 'RED';
    else if (risks.includes('YELLOW')) finalRisk = 'YELLOW';

    const details = {
      commitCheck,
      forkCheck
    };

    // Update submission in Supabase
    await supabase.from('submissions').update({
      plagiarism_status: finalRisk,
      plagiarism_details: details
    }).eq('id', submission.id);

    return {
      finalRisk,
      details
    };
  } catch (err) {
    console.error('[Plagiarism] fullPlagiarismCheck error:', err);
    return {
      finalRisk: 'YELLOW',
      details: 'Plagiarism check failed due to an error.'
    };
  }
}
