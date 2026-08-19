# PitchGauge

I want to build a complete AI-powered tool called Startup Evaluator Assistant using Gemini API only. The tool should evaluate both written startup pitches and pitch decks (PDFs) and output a structured venture capital investment memo and scorecard.
Please generate the entire project for me in Replit (free plan), including all frontend and backend files, with instructions to run it.
FEATURES REQUIRED
1. Frontend (Web Interface)
Text area for pasting a written startup pitch
File upload for PDF pitch decks
“Generate Analysis” button
Output area displaying:
Structured investment memo
VC scorecard (scores 0–10 for Team, Market Size, Product, Traction, Business Model, Defensibility)
2. Backend (Node.js + Express)
API endpoint /analyze to receive:
pasted text
PDF files (extract text using pdf-parse)
Send extracted text to Gemini API using the key stored in process.env.GEMINI_API_KEY
Return structured output to frontend
3. Gemini API Call
REST call to https://generativelanguage.googleapis.com/v1/models/{model}:generateContent
Use gemini-2.5-flash as the model
Header: "x-goog-api-key": process.env.GEMINI_API_KEY
Request body:
contents array with system + user messages
System prompt:
You are a venture analyst AI. When given either a written startup pitch or a pitch deck extracted from PDF, generate:
1) A structured investment memo with: Problem → Solution → Market → Traction → Business Model → Risks → Recommendation.
2) A VC scorecard with scores from 0–10 for: Team, Market Size, Product, Traction, Business Model, Defensibility.
Make the memo clean, structured, and concise.
Include error handling for API failures
4. Optional Features (for demo polish)
Show loading state while waiting for Gemini
Handle empty input / invalid PDF gracefully
Log raw Gemini response in Replit console for debugging
WHAT I WANT YOU TO GENERATE
index.html (frontend UI)
style.css (minimal styling)
script.js (handles form submission, PDF upload, shows results)
server.js (backend with Express, PDF parsing, Gemini API call)
package.json with dependencies (express, pdf-parse, node-fetch, dotenv)
Instructions to:
Install dependencies (npm install)
Add Gemini API key to Replit Secrets (GEMINI_API_KEY)
Run the app (npm start)
REQUIREMENTS
Clean, readable code
Fully working end-to-end demo
Free-tier Replit compatible
Support both text input and PDF uploads
Structured memo + scorecard output from Gemini
Do not include any OpenAI code
Minimal but functional UI for demo purposes

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pitchgauge.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f9b7d977-d562-4fca-8934-0784ce4eaf10).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
