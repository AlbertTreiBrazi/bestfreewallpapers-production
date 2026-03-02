# Best Free Wallpapers

A modern wallpaper download platform built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Backend:** Supabase (Database, Auth, Storage, Edge Functions)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase project

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your Supabase credentials to .env

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
├── src/
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── contexts/      # React contexts
│   ├── config/        # App configuration
│   ├── services/      # API services
│   └── utils/         # Utility functions
├── public/            # Static assets
├── supabase/          # Supabase functions
└── index.html         # Entry HTML
```

## License

All rights reserved.
