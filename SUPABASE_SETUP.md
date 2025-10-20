# Supabase Calendar Setup

This guide will help you set up the Supabase database schema and migrations for the Urbane Calendar application.

## Prerequisites

1. **Supabase CLI installed**: Follow the [Supabase CLI installation guide](https://supabase.com/docs/guides/cli)
2. **Supabase project created**: Create a new project at [supabase.com](https://supabase.com)
3. **Environment variables configured**: Make sure your `.env.local` file has the correct Supabase credentials

## Setup Instructions

### 1. Initialize Supabase in your project

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Run the migrations

The migration files are located in the `supabase/migrations/` directory:

- `20241201000001_create_calendar_schema.sql` - Creates the database schema
- `20241201000002_setup_rls_policies.sql` - Sets up Row Level Security policies
- `20241201000003_seed_data.sql` - Inserts seed data for testing

```bash
# Apply all migrations to your remote database
supabase db push

# Or if you want to run migrations locally first
supabase db reset
```

### 3. Set up user metadata for RLS

For the Row Level Security to work properly, you need to ensure that user metadata includes the `shop_id`. You can do this in your Supabase dashboard:

1. Go to Authentication > Users
2. Edit a user
3. In the "Raw user meta data" field, add:
```json
{
  "shop_id": "650e8400-e29b-41d4-a716-446655440001"
}
```

Or programmatically when creating users:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      shop_id: '650e8400-e29b-41d4-a716-446655440001'
    }
  }
});
```

### 4. Enable Real-time

Real-time is already configured in the seed data migration, but you can verify it's enabled:

1. Go to Database > Replication in your Supabase dashboard
2. Ensure the following tables have real-time enabled:
   - `shops`
   - `mechanics`
   - `jobs`
   - `scheduled_jobs`
   - `work_order_statuses`

### 5. Test the setup

You can test the setup by:

1. Starting your Next.js application
2. Logging in with a user that has the correct `shop_id` in their metadata
3. Navigating to the calendar page
4. Adding, editing, and scheduling jobs

## Database Schema Overview

### Tables

1. **shops** - Store shop information
2. **mechanics** - Store mechanic information (linked to shops)
3. **work_order_statuses** - Global work order status definitions
4. **jobs** - Work orders/jobs (linked to shops)
5. **scheduled_jobs** - Scheduled job assignments (links jobs to mechanics)

### Key Features

- **Row Level Security (RLS)**: Users can only access data from their own shop
- **Real-time subscriptions**: Changes are synchronized across all connected clients
- **Foreign key constraints**: Maintains data integrity
- **Indexes**: Optimized for common queries

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**: Make sure the user has the correct `shop_id` in their metadata
2. **Real-time not working**: Check that real-time is enabled for the tables in your Supabase dashboard
3. **Migration errors**: Ensure your Supabase project is properly linked and you have the correct permissions

### Reset the database

If you need to start over:

```bash
# Reset local database
supabase db reset

# Reset remote database (be careful!)
supabase db reset --linked
```

## Development

### Adding new migrations

1. Create a new migration file in `supabase/migrations/` with the format: `YYYYMMDDHHMMSS_description.sql`
2. Apply the migration: `supabase db push`
3. Test thoroughly before deploying to production

### Local development

For local development, you can start Supabase locally:

```bash
# Start Supabase locally
supabase start

# This will give you local URLs and keys to use in your .env.local
```

## Production Considerations

1. **Backup**: Set up regular backups of your production database
2. **Monitoring**: Monitor database performance and query execution times
3. **Scaling**: Consider read replicas for high-traffic applications
4. **Security**: Regularly review and audit your RLS policies

## Support

If you encounter issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the migration files for syntax errors
3. Check your Supabase project logs
4. Ensure all environment variables are correctly set
