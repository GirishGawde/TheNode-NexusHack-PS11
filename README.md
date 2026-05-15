# NexusHack

## Team Name
TheNode

## Problem Statement
**PS11:** Hackathons, tech fests, workshops, and college events are organized using a broken stack — Google Forms for registrations, WhatsApp for communication, spreadsheets for team tracking, and manual judging with paper rubrics. Organizers burn hours on coordination instead of experience design. Participants face unclear timelines, lost announcements, and no structured feedback. Sponsors have no visibility into participation quality or outcomes. The entire event lifecycle — from ideation to post-event analytics — lacks a unified, intelligent system built specifically for the tech event ecosystem.

## Team Members
- Manjunath Gavda (Frontend)
- Girish Gawde (Backend)
- Prasham Satarkar (AI Services & Integrations)

## Github Repositories
- https://github.com/GirishGawde/TheNode-NexusHack-PS11

## Demo Video
https://drive.google.com/drive/folders/1A1mTG0T1JKwIT3MsTr0KEUSbxKZfp1Ov?usp=sharing

## Presentation Link
https://docs.google.com/presentation/d/1Znmd80hkrm6goaumJFrYaoc6QKWUUuBM/edit?usp=drivesdk&ouid=115846440936058059943&rtpof=true&sd=true


## Features
- **Role-Based Access Control:** Dedicated, secure dashboards tailored for Participants, Organizers, and Judges.
- **Magic Link Judging:** Judges access the platform via secure, passwordless tokens, eliminating account creation friction.
- **AI Rubric Generator & Sentiment Scoring:** Powered by gemini api automatically suggest judging criteria and analyze written feedback to prevent bias.
- **Real-Time Leaderboard:** Supabase Realtime pushes live ranking updates to all users the second normalization is complete.
- **Automated Plagiarism Checks:** GitHub API integration checks commit timestamps and repository fork statuses upon project submission.
- **Telegram Bot Integration:** Participants receive live announcements and critical deadline warnings directly to their phones.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express.js, Puppeteer, Nodemailer
- **Database:** Supabase (PostgreSQL), Supabase Auth, Supabase Storage
- **APIs:** gemini API, Telegram Bot API, GitHub REST API

## setup instructions 

**Backend**
cd backend
npm install

**Frontend**
cd frontend
npm install