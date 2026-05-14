-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  college TEXT,
  city TEXT,
  state TEXT,
  profile_picture_url TEXT,
  college_id_url TEXT,
  signature_url TEXT,
  github_username TEXT,
  linkedin_url TEXT,
  skills TEXT[],
  year_of_study INTEGER,
  role TEXT DEFAULT 'participant',
  telegram_chat_id TEXT,
  opted_into_bot BOOLEAN DEFAULT false,
  past_participations INTEGER DEFAULT 0,
  past_wins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  submission_deadline TIMESTAMPTZ,
  max_participants INTEGER,
  max_team_size INTEGER DEFAULT 4,
  min_team_size INTEGER DEFAULT 1,
  allow_solo BOOLEAN DEFAULT true,
  venue_name TEXT,
  venue_latitude FLOAT,
  venue_longitude FLOAT,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#7C3AED',
  secondary_color TEXT DEFAULT '#06B6D4',
  status TEXT DEFAULT 'DRAFT',
  organiser_id UUID REFERENCES users(id),
  tracks TEXT[],
  prizes JSONB,
  judging_mode TEXT DEFAULT 'HYBRID',
  two_phase_judging BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rubric_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight FLOAT NOT NULL,
  order_index INTEGER,
  description TEXT
);

CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  leader_id UUID REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  track TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE team_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  is_solo BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  event_id UUID REFERENCES events(id),
  project_name TEXT,
  tagline TEXT,
  problem_statement TEXT,
  github_repo_url TEXT,
  github_usernames TEXT[],
  demo_link TEXT,
  tech_stack TEXT[],
  ppt_url TEXT,
  screenshot_urls TEXT[],
  what_makes_unique TEXT,
  challenges_faced TEXT,
  status TEXT DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  plagiarism_status TEXT DEFAULT 'PENDING',
  plagiarism_details JSONB,
  health_score INTEGER DEFAULT 0,
  ai_generated_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, event_id)
);

CREATE TABLE judges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  invite_token TEXT UNIQUE NOT NULL,
  token_expiry TIMESTAMPTZ,
  status TEXT DEFAULT 'INVITED',
  expertise TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE judge_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judge_id UUID REFERENCES judges(id),
  team_id UUID REFERENCES teams(id),
  event_id UUID REFERENCES events(id),
  status TEXT DEFAULT 'PENDING',
  UNIQUE(judge_id, team_id)
);

CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judge_id UUID REFERENCES judges(id),
  team_id UUID REFERENCES teams(id),
  event_id UUID REFERENCES events(id),
  input_mode TEXT,
  raw_feedback_text TEXT,
  private_notes TEXT,
  criteria_scores JSONB,
  weighted_total FLOAT,
  normalized_score FLOAT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(judge_id, team_id)
);

CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  organiser_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  urgency TEXT DEFAULT 'INFO',
  target_group TEXT DEFAULT 'ALL',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  team_id UUID REFERENCES teams(id),
  rank INTEGER,
  raw_score FLOAT,
  normalized_score FLOAT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  UNIQUE(event_id, team_id)
);

CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  team_id UUID REFERENCES teams(id),
  rank INTEGER,
  certificate_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE co_organisers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  invite_token TEXT,
  access_level TEXT DEFAULT 'LIMITED',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published events" ON events FOR SELECT USING (status = 'PUBLISHED' OR status = 'LIVE' OR status = 'ENDED');
CREATE POLICY "Organisers can manage own events" ON events FOR ALL USING (auth.uid() = organiser_id);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view own submission" ON submissions FOR SELECT USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
