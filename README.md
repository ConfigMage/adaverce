# Help Wanted: Writers' Room

A small private web app for planning and running the Minecraft let's play series "Help Wanted." Pick the session you're on and ask for work orders, Chaos Wheel rules, bits, off-script recoveries, or YouTube titles. Every answer is grounded in the series plan in `content/series-plan.md`.

Single user, passcode protected, no database. Chat history and saved ideas live in the browser's localStorage.

## Local setup

```bash
cp .env.example .env.local
# fill in the four values in .env.local
npm install
npm run dev
```

Open http://localhost:3000, enter the passcode, and you're in.

Other commands:

```bash
npm run build   # production build
npm run lint    # eslint
npm start       # serve the production build
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic API key. Read only on the server. Never prefix it with `NEXT_PUBLIC_`. |
| `ANTHROPIC_MODEL` | Model ID for every request. Optional, defaults to `claude-sonnet-5`. |
| `APP_PASSCODE` | The passcode typed on the login page. |
| `AUTH_SECRET` | Long random string used to sign the login cookie. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Changing it logs everyone out. |

## Deploy on Vercel

1. Push this folder to a Git repository (GitHub, GitLab, or Bitbucket).
2. In Vercel, choose "Add New Project" and import the repository. The Next.js defaults are fine.
3. Under Project Settings, then Environment Variables, add the four variables above for the Production environment.
4. Deploy. Later pushes to the default branch redeploy automatically.

The series plan ships with the deployment. To change the story, edit `content/series-plan.md` and push.

## Cost safety

- Use a dedicated API key for this app so it can be revoked on its own without touching anything else.
- In the Anthropic Console, set a monthly spend limit for that key's workspace so a leaked passcode can't run up a bill.
- The server caps every request at 20 messages of 4,000 characters and 1,200 output tokens.

## Editing the series plan

`content/series-plan.md` is read once per server instance and placed in the system prompt. Edit the plan there, not in the code.
