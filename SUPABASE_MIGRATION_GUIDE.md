# Firebase to Supabase Migration Guide

## Overview
This guide will help you migrate the Investment Management System from Firebase to Supabase. The migration involves replacing Firebase Firestore with Supabase PostgreSQL and updating the authentication system.

## Prerequisites
1. A Supabase account (sign up at https://supabase.com)
2. Node.js installed on your system
3. Git (for version control)

## Step 1: Create Supabase Project

1. **Sign up/Login to Supabase**
   - Go to https://supabase.com
   - Create an account or login

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - **Name**: `investment-management` (or your preferred name)
     - **Database Password**: Generate a strong password (save this!)
     - **Region**: Choose closest to your users
   - Click "Create new project"

3. **Wait for Setup**
   - Supabase will provision your database (takes 1-2 minutes)

## Step 2: Get Supabase Credentials

1. **Go to Project Settings**
   - In your Supabase dashboard, click the gear icon (⚙️)
   - Select "API"

2. **Copy Credentials**
   - **Project URL**: Copy the URL (e.g., `https://your-project.supabase.co`)
   - **Anon Key**: Copy the anon/public key

## Step 3: Update Configuration

1. **Update Supabase Config**
   - Open `src/supabase/config.js`
   - Replace the placeholder values:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL' // Replace with your Project URL
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY' // Replace with your Anon Key
   ```

2. **Example Configuration**
   ```javascript
   const supabaseUrl = 'https://abcdefghijklmnop.supabase.co'
   const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   ```

## Step 4: Set Up Database Schema

1. **Open SQL Editor**
   - In Supabase dashboard, go to "SQL Editor"
   - Click "New Query"

2. **Run Schema Script**
   - Copy the entire content from `supabase-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

3. **Verify Tables Created**
   - Go to "Table Editor" in Supabase dashboard
   - You should see these tables:
     - `members`
     - `share_prices`
     - `company_transactions`

## Step 5: Set Up Authentication

1. **Enable Email Authentication**
   - Go to "Authentication" → "Settings"
   - Under "Auth Providers", ensure "Email" is enabled
   - Configure email settings if needed

2. **Create Admin User**
   - Go to "Authentication" → "Users"
   - Click "Add User"
   - Enter admin email and password
   - Click "Create User"

## Step 6: Install Dependencies

1. **Remove Firebase**
   ```bash
   npm uninstall firebase
   ```

2. **Install Supabase**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Verify Installation**
   ```bash
   npm list @supabase/supabase-js
   ```

## Step 7: Update Environment Variables (Optional)

For better security, you can use environment variables:

1. **Create .env file**
   ```bash
   touch .env
   ```

2. **Add Environment Variables**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Update Config to Use Environment Variables**
   ```javascript
   // src/supabase/config.js
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   ```

## Step 8: Test the Migration

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Login**
   - Go to the login page
   - Use the admin credentials you created
   - Verify you can access the admin dashboard

3. **Test Member Creation**
   - Try adding a new member
   - Verify data is saved to Supabase

4. **Check Database**
   - Go to Supabase Table Editor
   - Verify data appears in the `members` table

## Step 9: Data Migration (If You Have Existing Data)

If you have existing Firebase data to migrate:

1. **Export Firebase Data**
   - Use Firebase Console to export your data
   - Or use Firebase Admin SDK to export programmatically

2. **Transform Data Format**
   - Convert Firebase document structure to PostgreSQL rows
   - Handle JSON fields appropriately

3. **Import to Supabase**
   - Use Supabase dashboard or API to import data
   - Or create a migration script

## Step 10: Update Remaining Components

The following components still need to be updated to use Supabase:

### Components to Update:
1. **MemberDetail.jsx** - Update member data fetching and updates
2. **Financial.jsx** - Update member creation and data saving
3. **Pd.jsx** - Update personal details saving
4. **Insurance.jsx** - Update insurance data saving
5. **Payment.jsx** - Update payment data saving
6. **SharePrice.jsx** - Update share price management
7. **Compamt.jsx** - Update company amount calculations
8. **MonthlyActivity.jsx** - Update activity tracking

### Key Changes Needed:
- Replace `db` imports with `supabase` imports
- Update Firestore queries to Supabase queries
- Update real-time listeners to Supabase subscriptions
- Update data structure to match PostgreSQL schema

## Step 11: Deploy and Test

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Deploy to Your Hosting Platform**
   - Update environment variables in your hosting platform
   - Deploy the built application

3. **Test Production**
   - Verify all features work in production
   - Test with real data

## Troubleshooting

### Common Issues:

1. **Authentication Errors**
   - Verify Supabase URL and keys are correct
   - Check if email authentication is enabled
   - Ensure user exists in Supabase Auth

2. **Database Connection Issues**
   - Check if RLS policies are correctly set
   - Verify table permissions
   - Check network connectivity

3. **Real-time Updates Not Working**
   - Ensure Supabase subscriptions are properly set up
   - Check if RLS policies allow real-time subscriptions

4. **Data Format Issues**
   - Verify JSON fields are properly formatted
   - Check data types match PostgreSQL schema

### Getting Help:
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create issues in your project repository

## Migration Checklist

- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Supabase credentials configured
- [ ] Admin user created
- [ ] Dependencies updated
- [ ] Login functionality tested
- [ ] Member creation tested
- [ ] All components updated
- [ ] Real-time updates working
- [ ] Production deployment tested

## Next Steps

After successful migration:

1. **Monitor Performance**
   - Check Supabase dashboard for query performance
   - Monitor database usage and costs

2. **Set Up Backups**
   - Configure automated backups in Supabase
   - Set up point-in-time recovery

3. **Optimize Queries**
   - Add database indexes for better performance
   - Optimize RLS policies

4. **Security Review**
   - Review RLS policies
   - Audit user permissions
   - Enable additional security features

## Support

If you encounter issues during migration:
1. Check the Supabase documentation
2. Review the error logs in Supabase dashboard
3. Test with a simple query first
4. Verify your configuration settings

The migration from Firebase to Supabase provides better performance, more control over your database, and additional features like real-time subscriptions and built-in authentication.

