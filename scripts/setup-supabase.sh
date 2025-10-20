#!/bin/bash

# Supabase Calendar Setup Script
# This script helps set up the Supabase database for the Urbane Calendar application

set -e

echo "🚀 Setting up Supabase for Urbane Calendar..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    echo "   or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "🔧 Initializing Supabase project..."
    supabase init
fi

# Check if project is linked
if ! supabase status &> /dev/null; then
    echo "📎 Please link your Supabase project first:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "   You can find your project reference in your Supabase dashboard URL:"
    echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Supabase project is linked"

# Apply migrations
echo "📦 Applying database migrations..."
supabase db push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up user metadata with shop_id in your Supabase dashboard"
echo "2. Enable real-time for tables if not already enabled"
echo "3. Test the calendar functionality"
echo ""
echo "For detailed instructions, see SUPABASE_SETUP.md"
