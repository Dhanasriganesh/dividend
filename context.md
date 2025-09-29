# Investment Management System - Project Context

## Project Overview
This is a comprehensive **Investment Management System** built for "K-G Admin" (likely a cooperative society or investment group). The system manages member registrations, monthly investments, share prices, payments, and financial tracking for an investment organization.

## Technology Stack

### Frontend Framework
- **React 19.1.0** - Modern React with latest features
- **Vite 6.3.5** - Fast build tool and development server
- **React Router DOM 7.6.2** - Client-side routing

### Styling & UI
- **Tailwind CSS 4.1.10** - Utility-first CSS framework
- **Lucide React 0.537.0** - Modern icon library
- Custom gradient designs with amber/yellow color scheme

### Backend & Database
- **Firebase 12.0.0** - Backend-as-a-Service
  - **Firebase Authentication** - User authentication
  - **Firestore** - NoSQL database for data storage
- **Firebase Project**: `gold-khaatha` (configured)

### Additional Libraries
- **XLSX 0.18.5** - Excel file generation for reports
- **ESLint** - Code linting and quality assurance

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── Layout.jsx          # Main app layout with header/footer
│   ├── routers/
│   │   └── Routers.jsx         # Route definitions and protected routes
│   ├── pages/
│   │   ├── Login.jsx           # Authentication page
│   │   ├── Admin.jsx           # Main dashboard
│   │   ├── Members.jsx         # Member directory
│   │   ├── MemberDetail.jsx    # Individual member management
│   │   ├── MonthlyActivity.jsx # Monthly investment/withdrawal tracking
│   │   ├── SharePrice.jsx      # Share price management
│   │   ├── Compamt.jsx         # Company amount overview
│   │   ├── MainAdmin.jsx       # (Empty placeholder)
│   │   └── addMember/
│   │       ├── Financial.jsx   # Financial indicators step
│   │       ├── Pd.jsx          # Personal details step
│   │       ├── Insurance.jsx   # Insurance details step
│   │       └── Payment.jsx     # Payment/membership step
│   ├── header/
│   │   └── Header.jsx          # Navigation header
│   └── footer/
│       └── Footer.jsx          # Footer component
├── context/
│   └── AuthContext.jsx         # Authentication state management
├── firebase/
│   └── config.js              # Firebase configuration
├── assets/
│   ├── bg.jpg                 # Background image
│   └── react.svg              # React logo
├── App.jsx                    # Main app component
├── main.jsx                   # Application entry point
├── App.css                    # Global styles
└── index.css                  # Base styles
```

## Core Features

### 1. Authentication System
- **Firebase Authentication** with email/password
- **Protected Routes** - All admin features require authentication
- **Session Management** - Automatic login state persistence
- **Logout Functionality** - Secure session termination

### 2. Member Management
- **Member Registration** - 4-step wizard process:
  1. **Financial Indicators** - Share prices, dividend settings
  2. **Personal Details** - Basic info, family members, nominees
  3. **Insurance Details** - Health, accidental, term life insurance
  4. **Payment Details** - Membership fees, ID generation
- **Member Directory** - Searchable list of all members
- **Member Profiles** - Detailed member information and payment history
- **Unique Membership IDs** - Auto-generated format: `YYYY-XXX` (e.g., 2025-001)

### 3. Investment Tracking
- **Monthly Activities** - Record investments and withdrawals per month
- **Share Price Management** - Set and track monthly share prices
- **Investment Calculations** - Automatic share calculation based on amount/price
- **Withdrawal System** - Share-based withdrawal with approval workflow
- **Fine Management** - Late payment fines tracking

### 4. Financial Management
- **Company Amount Overview** - Registration fees and fine tracking
- **Payment History** - Monthly payment tracking per member
- **Report Generation** - Excel export for investment reports
- **Balance Calculations** - Company balance and member share totals

### 5. Data Management
- **Real-time Updates** - Firestore listeners for live data sync
- **Data Validation** - Form validation and error handling
- **Excel Export** - Investment reports with detailed breakdowns
- **Search & Filter** - Member search by name or phone number

## Database Schema (Firestore)

### Collections

#### `members`
```javascript
{
  // Basic Info
  name: string,
  phoneNo: string,
  email: string,
  address: string,
  age: number,
  gender: string,
  maritalStatus: string,
  bloodGroup: string,
  occupation: string,
  specialization: string,
  relation: string, // S/O, D/O, M/O
  totalMembers: number,
  
  // Family & Nominees
  familyMembers: [
    { name, age, education, work }
  ],
  nominees: [string],
  
  // Financial Data
  financial: {
    presentSharePrice: number,
    updatedSharePrice: number,
    dividendPerShare: number,
    notes: string
  },
  
  // Insurance Data
  insurance: {
    health: { enabled, types, companyPlan, premiumAmount, membersCovered, sumInsured, policyAnniversaryDate, reminders, notes },
    accidental: { ... },
    termLife: { ... },
    willingToWork: string,
    reference: { name, phone, registrationId }
  },
  
  // Payment Data
  payment: {
    dateOfJoining: string,
    membershipId: string, // Format: YYYY-XXX
    payingMembershipAmount: number,
    membershipType: string,
    paymentStatus: string,
    notes: string
  },
  
  // Activities (Monthly)
  activities: {
    [year]: {
      [month]: {
        investment: {
          type: 'investment',
          amount: number,
          fine: number,
          sharePrice: number,
          shares: number,
          customReceipt: string,
          createdAt: Date
        },
        withdrawal: {
          type: 'withdrawal',
          amount: number,
          shares: number,
          sharePrice: number,
          status: string,
          createdAt: Date
        }
      }
    }
  },
  
  // Legacy Payment Structure
  payments: {
    [year]: {
      [month]: {
        amount: number,
        mode: string, // 'cash' | 'online'
        fine: number
      }
    }
  },
  
  // Calculated Fields
  totalShares: number,
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date
}
```

#### `sharePrices`
```javascript
{
  year: number,
  month: string, // 'Jan', 'Feb', etc.
  price: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### `companyTransactions`
```javascript
{
  memberId: string,
  memberName: string,
  membershipId: string,
  type: 'investment',
  amount: number,
  fine: number,
  year: number,
  month: string,
  customReceipt: string,
  sharePrice: number,
  shares: number,
  createdAt: Date,
  description: string
}
```

## Key Business Logic

### 1. Member Registration Flow
- **Step 1**: Financial indicators (share prices, dividends)
- **Step 2**: Personal details (basic info, family, nominees)
- **Step 3**: Insurance details (health, accidental, term life)
- **Step 4**: Payment details (membership fees, ID generation)
- **Phone Number as ID**: Members are identified by phone number
- **Auto-generated IDs**: Membership IDs follow `YYYY-XXX` format

### 2. Investment System
- **Monthly Investments**: One investment per member per month
- **Share Calculation**: `shares = amount / sharePrice`
- **Current Month Only**: Investments can only be recorded for current month
- **Company Member**: Special handling for "SMDB-1" membership ID
- **Fine System**: Late payment fines tracked separately

### 3. Withdrawal System
- **Share-based Withdrawals**: Withdrawals calculated based on shares
- **Approval Workflow**: Two-step approval process
- **Balance Validation**: Ensures sufficient shares available
- **Current Month Only**: Withdrawals restricted to current month

### 4. Share Price Management
- **Monthly Prices**: Share prices set per month/year
- **Price History**: Complete historical tracking
- **Edit/Delete**: Full CRUD operations on share prices

### 5. Payment Tracking
- **Monthly Payments**: Track payments by year/month
- **Payment Status**: Fully paid, partially paid, unpaid
- **Fine Integration**: Fines tracked separately from payments
- **Report Generation**: Excel exports for payment history

## Security Features

### 1. Authentication
- **Firebase Auth**: Secure email/password authentication
- **Protected Routes**: All admin features require authentication
- **Session Management**: Automatic session persistence and cleanup

### 2. Data Validation
- **Form Validation**: Client-side validation for all forms
- **Phone Uniqueness**: Prevents duplicate phone numbers
- **Required Fields**: Comprehensive required field validation
- **Data Sanitization**: Input sanitization and type checking

### 3. Business Rules
- **Current Month Restriction**: Activities limited to current month
- **One Investment Per Month**: Prevents duplicate investments
- **Share Balance Validation**: Ensures sufficient shares for withdrawals
- **Membership ID Uniqueness**: Auto-generated unique IDs

## UI/UX Design

### 1. Design System
- **Color Scheme**: Amber/yellow gradient theme
- **Typography**: Inter font family
- **Components**: Consistent card-based layouts
- **Responsive**: Mobile-first responsive design

### 2. User Experience
- **Multi-step Forms**: Guided registration process
- **Real-time Updates**: Live data synchronization
- **Search & Filter**: Easy member discovery
- **Progress Indicators**: Visual progress tracking
- **Error Handling**: Comprehensive error messages

### 3. Navigation
- **Dashboard**: Central hub with quick actions
- **Breadcrumbs**: Clear navigation hierarchy
- **Back Buttons**: Easy navigation between pages
- **Modal Dialogs**: Inline editing and confirmations

## Development Setup

### Prerequisites
- Node.js (latest LTS)
- Firebase project setup
- Git

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Firebase Configuration

### Required Setup
1. **Firebase Project**: Create project in Firebase Console
2. **Authentication**: Enable Email/Password authentication
3. **Firestore**: Create Firestore database
4. **Admin User**: Create admin user in Authentication
5. **Config Update**: Replace placeholder config in `src/firebase/config.js`

### Current Configuration
- **Project ID**: `gold-khaatha`
- **Auth Domain**: `gold-khaatha.firebaseapp.com`
- **Storage**: `gold-khaatha.firebasestorage.app`

## File Structure Details

### Component Organization
- **Pages**: Main application screens
- **Layout**: Reusable layout components
- **Context**: Global state management
- **Firebase**: Database configuration and utilities

### Styling Approach
- **Tailwind CSS**: Utility-first styling
- **Component Styles**: Scoped component styling
- **Global Styles**: Base styles and resets
- **Responsive Design**: Mobile-first approach

## Key Features Summary

1. **Complete Member Lifecycle**: Registration to investment tracking
2. **Real-time Data Sync**: Live updates across all clients
3. **Comprehensive Reporting**: Excel export capabilities
4. **Financial Management**: Share prices, investments, withdrawals
5. **Insurance Tracking**: Multiple insurance types and details
6. **Payment Management**: Monthly payment tracking and fines
7. **Company Overview**: Financial summary and transaction tracking
8. **Security**: Authentication and data validation
9. **Responsive Design**: Works on all device sizes
10. **Modern Tech Stack**: Latest React and Firebase features

This system provides a complete solution for managing an investment cooperative or society, with comprehensive member management, financial tracking, and reporting capabilities.

