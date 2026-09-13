# DevPulse

DevPulse is a lightweight GitHub developer analytics dashboard. Enter a GitHub username to explore repository statistics, language distribution, detailed repository languages, and commit activity across the last 12 months.

## Features

- Fetches up to 100 public repositories for a GitHub username
- Shows repository visibility, stars, forks, and descriptions
- Visualizes the distribution of primary repository languages
- Expands each repository to show its language breakdown by bytes
- Displays monthly commit activity for the last 12 months
- Responsive layout for desktop and mobile screens

## Tech stack

- [Next.js](https://nextjs.org/) 16 with the App Router
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Recharts](https://recharts.org/) for data visualization
- GitHub REST API

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm
- A GitHub account if you want to create an API token

### Installation

```bash
git clone <repository-url>
cd devpulse
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### GitHub token

The dashboard works without authentication, but GitHub limits unauthenticated Search API requests to 10 requests per minute. The activity chart makes one request per month, so a token is recommended for reliable results. The contribution heatmap uses GitHub's GraphQL API and requires a token.

Create a `.env.local` file in the project root:

```env
GITHUB_TOKEN=your_github_personal_access_token
```

You can use `.env.example` as a template. Copy it to `.env.local`, replace the placeholder with your token, and restart the server:

```bash
cp .env.example .env.local
npm run dev
```

The token only needs read access to public repositories. Never commit `.env.local` or expose the token in client-side code.

After creating or changing `.env.local`, restart the development server:

```bash
npm run dev
```

## Available scripts

```bash
npm run dev      # Start the development server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Start the production server
```

## How it works

The client sends a username to `/api/github/repos`. The server then:

1. Fetches the user's repositories from GitHub.
2. Queries GitHub commit search for each of the last 12 calendar months.
3. Returns repository data and monthly commit totals to the dashboard.

If an individual activity request fails, the other months are still returned and the dashboard displays a warning instead of failing the entire request.

## Project structure

```text
app/
├── api/github/repos/route.ts  # GitHub repository and activity API route
├── globals.css                # Global styles and Tailwind entry point
├── layout.tsx                 # Root layout
└── page.tsx                   # Dashboard UI
public/                        # Static assets
```

## Deployment

The project can be deployed to [Vercel](https://vercel.com/) or any platform that supports Next.js. Add `GITHUB_TOKEN` to the deployment environment variables before deploying.

## License

Belong to Kelemeng21
