#!/bin/bash

# Start local Supabase development environment
# Uses Docker to spin up a full Supabase stack locally.
# No connection to production — safe for schema experiments.

set -e

echo "🔧 Starting local Supabase development environment..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Install it first:"
    echo "   https://docs.docker.com/desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Start Docker Desktop first."
    exit 1
fi

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Start Supabase if not already running
if supabase status &> /dev/null; then
    echo "✅ Supabase is already running locally"
else
    echo "🐳 Starting Supabase in Docker (this may take a minute on first run)..."
    supabase start
fi

echo ""
echo "📦 Resetting local database and applying migrations + seed data..."
supabase db reset

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Local Supabase is ready!"
echo ""
echo "Update your .env.local with these values:"
echo ""
echo "  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
echo "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=<anon key from supabase start output above>"
echo "  SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start output above>"
echo ""
echo "  RESEND_API_KEY can be left blank — local Inbucket captures emails at:"
echo "  http://127.0.0.1:54324"
echo ""
echo "Useful commands:"
echo "  supabase status          Check what's running"
echo "  supabase stop            Stop all local containers"
echo "  supabase db reset        Re-create DB from scratch"
echo "  npm run dev              Start the Next.js app"
echo ""

echo "Then run:"
echo "  npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
