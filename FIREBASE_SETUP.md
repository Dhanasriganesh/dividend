 # Firebase Setup Guide

## Prerequisites
1. Install Firebase: `npm install firebase`

## Firebase Configuration

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name
4. Follow the setup wizard

### Step 2: Enable Authentication
1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

### Step 3: Create Admin User
1. In the Authentication section, go to "Users" tab
2. Click "Add user"
3. Enter the admin email and password
4. This will be the credentials you use to log in

### Step 4: Get Firebase Config
1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname
6. Copy the firebaseConfig object

### Step 5: Update Configuration
Replace the placeholder values in `src/firebase/config.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Features Implemented

### Login Page (`/`)
- Email and password authentication
- Form validation
- Error handling
- Loading states
- Automatic redirect to admin panel on successful login

### Admin Dashboard (`/admin`)
- Protected route (requires authentication)
- Welcome message with user email
- Logout functionality
- Sample admin interface with placeholder sections

### Authentication Features
- Firebase Authentication integration
- Protected routes
- Automatic session management
- Logout functionality
- Redirect to login if not authenticated

## Usage
1. Start the development server: `npm run dev`
2. Navigate to the login page
3. Use the admin credentials you created in Firebase
4. You'll be redirected to the admin dashboard upon successful login

## Security Notes
- The admin route is protected and will redirect to login if not authenticated
- Firebase handles all authentication securely
- Session state is managed automatically
- Logout clears the session and redirects to login 