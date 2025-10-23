
**K-G Investment Management System** is a comprehensive platform designed to manage an investment cooperative where members make monthly investments, receive shares, and participate in profit-sharing activities. The system tracks member information, investments, share allocations, company finances, and generates various financial reports.

### Core Concept
- Members join by paying a membership fee (₹10,000)
- Members invest monthly (typically ₹2,000 per month)
- Investments are converted to shares based on quarterly share prices
- The system tracks all financial activities, share ownership, and company funds
- Members can withdraw investments, receive dividends, and get refunds after 1 year

---

## Login & Authentication

### How Login Works

**Purpose:** Secure access control for administrators and employees

**Login Page Features:**
1. **Visual Design**
   - Split-screen layout with background image
   - Professional login form with gradient styling
   - Email and password input fields
   - Show/hide password toggle
   - Secure sessions & reload option

2. **User Types**
   - **Admin Users:** Full system access using Supabase authentication
   - **Employee Users:** Limited access based on assigned permissions
   - Employee credentials are pre-configured in the system

3. **Authentication Process**
   - Admin users: Authentication through Supabase
   - Employee users: Credential validation with local session storage
   - Automatic navigation to Admin Dashboard upon successful login
   - Error messages for invalid credentials

4. **Session Management**
   - Active sessions maintained throughout usage
   - Session clear and reload option available
   - Automatic logout when session expires

---

## Admin Dashboard

### Overview
The **Admin Dashboard** is the central hub of the system where administrators can access all major functions. It's organized with tiles (cards) representing different sections.

### Dashboard Sections

#### 1. **Employee Access Management** (Admin Only)
**Purpose:** Control which features employees can access

**How It Works:**
- Only visible to admin users
- Opens a modal showing all employees
- For each employee, shows toggles for different features:
  - Company Account access
  - Members directory access
  - Dividend Donation access
  - Add Member access
  - Company Amount access
  - Share Price access
  - Download Report access
  
- Admins can turn permissions ON/OFF instantly
- Changes are saved automatically
- Employees will only see tiles they have permission for

**Example:**
> If an employee only has "Members" and "Add Member" permissions enabled, they'll only see those two tiles on their dashboard.

#### 2. **Monthly Share Price**
**Purpose:** Manage and update share prices month by month

**What It Does:**
- Shows historical share prices by year and month
- Allows adding new share prices for each month independently
- Supports editing existing prices
- Displays when each price was set
- Used for calculating how many shares members get for their investments

**Example:**
> If the share price for January 2025 is set at ₹30, then a member investing ₹2,000 in January will receive 66.67 shares (2000 ÷ 30)

#### 3. **Membership Refund**
**Purpose:** Settle membership fee refunds for members

**What It Does:**
- Automatically identifies members eligible for ₹10,000 refund (after 5 years)
- Shows three categories:
  - Members who completed 5 years (automatically eligible)
  - Members under 5 years (can still be settled manually)
  - Members whose refunds have been settled
- One-click settle button for any member
- Records settlement transaction in company finances

**Business Rule:**
> Members become automatically eligible for ₹10,000 refund after completing 5 years, but admin can settle refunds anytime before 5 years if needed.

#### 4. **Company Account**
**Purpose:** Quick access to the special Company Account member profile

**What It Does:**
- Opens the detail page for "Company Account" member (Member-ID: 2025-002)
- This is a special member that represents the company itself
- Shows company's own investments and shareholding

#### 5. **Members Directory**
**Purpose:** Browse and search all members

**What It Does:**
- Lists all members with:
  - Serial number
  - Joining date
  - Member name
  - Member-ID
  - Mobile number
- Search functionality by name or mobile number
- Click on any member to view their detailed profile
- Real-time updates when member data changes

#### 6. **Dividend Donation**
**Purpose:** View which members qualify for dividend distribution

**What It Does:**
- Filters members based on:
  - Event date (when dividend is being distributed)
  - Minimum holding period (typically 12 months)
- Shows two lists:
  - **Eligible Members:** Those who invested and held shares long enough
  - **Ineligible Members:** Those who don't meet the criteria
- Displays complete member details:
  - Member ID, Name, Mobile, Email
  - Joining date, Months held, Total shares
  - Reason for ineligibility

**Example:**
> For a dividend event on March 2025 with 12-month minimum holding:
> - Member A joined in Jan 2024 (14 months held) → ELIGIBLE ✓
> - Member B joined in May 2024 (10 months held) → INELIGIBLE (Only 10 months)

#### 7. **Add Member**
**Purpose:** Register new members in the system

**What It Does:**
- Opens a 3-step registration form:
  1. **Personal Details** (Pd.jsx)
  2. **Insurance Details** (Insurance.jsx)
  3. **Payment Details** (Payment.jsx)
- Guides through complete member onboarding
- Validates all information
- Creates member record in database

#### 8. **Company Owns Amount**
**Purpose:** Track all company income and investments

**What It Does:**
- Shows four main financial cards:
  - **Total Registration Fees:** All membership fees collected (₹10,000 per member)
  - **Total Fines:** Late payment fines collected
  - **Dividend Investment:** Company's portion from dividend donations
  - **Available Balance:** Money ready to be invested

- Displays detailed breakdown:
  - Registration payments table (member-wise)
  - Company investment transactions
  - Dividend donation events
  - Fine collection details

- **"Invest Current Balance" Button:**
  - Invests all available company balance
  - Converts balance to shares at current share price
  - Records transaction under Company Account member
  - Updates company's total shares

**Financial Flow Example:**
> Company collects:
> - ₹50,000 from 5 new members (registration)
> - ₹5,000 in fines
> - ₹10,000 from dividend donation events
> - **Total:** ₹65,000 available
> - Admin clicks "Invest Current Balance"
> - At ₹30 per share, company gets 2,166 shares
> - Balance becomes ₹0

#### 9. **Reports**
**Purpose:** Generate and download various financial reports

**What It Does:**
- Offers 9 different report types (detailed in Reports section below)
- Select year and month for report period
- Configure custom date ranges for specific reports
- Download reports as Excel files
- Each report provides different insights into the business

---

## Member Management

### Adding New Members (3-Step Process)

#### Step 1: Personal Details (Pd.jsx)

**Purpose:** Collect basic personal and family information

**Information Collected:**

**Required Fields:**
- **Name:** Member's full name
- **S/O/D/O/M/O:** Father/Mother/Spouse name
- **Age:** Member's age
- **Gender:** Male/Female/Others
- **Marital Status:** Married/Unmarried
- **Occupation:** Member's profession
- **Specialization:** Field of expertise
- **Address:** Complete residential address
- **Phone Number:** 10-digit mobile number (unique identifier)
- **Email:** Valid email address
- **Total Members:** Number of family members

**Optional Fields:**
- **Blood Group:** A+, A-, B+, B-, AB+, AB-, O+, O-
- **Family Members Details (Up to 4):**
  - Name, Age, Education, Work for each family member
- **Nominee Details (Up to 3):**
  - Names of nominees for insurance/benefits

**Validation Rules:**
- Phone number must be exactly 10 digits
- Phone number must be unique (no duplicate members)
- Email must be in valid format
- Age must be between 1-120
- All required fields must be filled

**After Submission:**
- Data saved to database
- Phone number stored as session identifier
- System navigates to Insurance page

#### Step 2: Insurance Details (Insurance.jsx)

**Purpose:** Record insurance policy information

**Information Collected:**

**Required Fields:**
- **Insurance Company Name:** Name of the insurance provider
- **Policy Number:** Unique policy identifier
- **Policy Start Date:** When policy becomes active
- **Policy End Date:** When policy expires
- **Policy Type:** Type of insurance (Life, Health, etc.)
- **Sum Assured:** Coverage amount (₹)
- **Premium Amount:** Amount to be paid
- **Premium Frequency:** How often premium is paid
  - Monthly, Quarterly, Half-yearly, Yearly
- **Policy Status:** Active, Inactive, Expired, Lapsed

**Optional Fields:**
- **Nominee Name:** Insurance beneficiary
- **Nominee Relation:** Relationship with member
- **Agent Name:** Insurance agent's name
- **Agent Contact:** Agent's phone number
- **Additional Notes:** Any extra information

**Features:**
- Can add multiple insurance policies
- Each policy shown as a separate card
- Edit or delete existing policies
- View all policies for the member

**After Submission:**
- Insurance records saved
- System navigates to Payment page

#### Step 3: Payment Details (Payment.jsx)

**Purpose:** Configure membership payment and finalize registration

**Information Collected:**

**Required Fields:**
- **Membership Amount:** Fee amount (typically ₹10,000)
- **Payment Status:** 
  - **Paid:** Full amount paid
  - **Due:** Partial payment or unpaid
- **Date of Joining:** Official membership start date
- **Payment Method:** Cash or Online
- **Membership ID:** Auto-generated unique identifier (format: YYYY-NNN)

**If Payment Status is "Due":**
- **Amount Paying Now:** Partial payment amount
- **Due Amount:** Automatically calculated (Total - Paying Now)
- Due amount tracked separately in member record

**Auto-Generated Fields:**
- **Membership ID:** Format `YYYY-NNN` (e.g., 2025-001, 2025-002)
  - YYYY = Current year
  - NNN = Sequential number (padded to 3 digits)
  - System checks existing IDs and generates next available

**After Submission:**
- Member registration complete
- Membership payment recorded
- If "Paid," registration amount goes to company balance
- If "Due," only partial amount goes to company balance
- Member can now make monthly investments
- System navigates back to Admin Dashboard

**Important Notes:**
- Phone number from Step 1 is used as unique identifier throughout
- All three steps must be completed for full member registration
- Data can be edited later from Member Detail page
- Registration amount (or partial amount) immediately appears in "Company Owns Amount"

### Viewing Member Details

**Purpose:** View complete member profile and manage monthly payments

**How to Access:**
- Click on any member from Members directory
- Or click Company Account tile for special company member

**Page Layout:**

#### Left Sidebar (Profile Card):
1. **Member Overview:**
   - Member name with first letter avatar
   - Member-ID
   - Phone number
   - Joining date

2. **Statistics Card:**
   - Number of months paid
   - Total amount paid
   - Completion percentage

3. **Membership Amount:**
   - Shows configured membership fee
   - **Due Amount Alert (if applicable):**
     - Red highlighted box showing due amount
     - "Paid Now" button to mark as paid
     - When clicked, updates payment status to "Paid"
     - Due amount moves to fine collection
   - Payment status indicator (Fully Paid or Due)
   - Back to Dashboard button

#### Main Content Area:
1. **Year/Month Selector:**
   - Dropdown to select year
   - Dropdown to select "Selected Year" or "All Years" for report
   - "Download Report" button - exports payment history to Excel

2. **Monthly Breakdown List:**
   - Shows all 12 months starting from joining month
   - For each month displays:
     - Month name and number
     - **Status column:** Shows investment/withdrawal activity
       - "Invested: ₹X" in green if member invested
       - "Withdrawn: ₹X" in red if member withdrew
       - "No activity" in gray if nothing happened
     - **Activity Button:** Opens monthly activity page
   
3. **Visual Indicators:**
   - Starting month marked with blue accent bar
   - Months before joining are hidden
   - Current month highlighted

**Real-Time Updates:**
- Page automatically refreshes when data changes
- No need to reload manually

---

## Monthly Activities

**Purpose:** Record monthly investments or withdrawals for any member

**How to Access:**
- From Member Detail page → Click "Activity" button for any month
- URL format: `/member/{member-id}/activity/{year}/{month}`

### Page Features:

#### Restriction Notice:
- **Important Rule:** Can only record activities for current calendar month
- Past months: "View-only" mode with amber warning banner
- Future months: Not accessible

#### Three Activity Types:

### 1. Investment Activity

**Purpose:** Record monthly investment and allocate shares

**Process:**

1. **Check Existing Investment:**
   - System checks if investment already exists for this month
   - **One investment per month rule** - if exists, shows details in green box:
     - Amount invested
     - Shares received
     - Share price used
     - Fine amount (if any)
     - Receipt number
     - Date of investment
   - Cannot add another investment for same month

2. **If No Investment Exists:**

**Fields Displayed:**
- **Amount (₹):** Enter investment amount (typically ₹2,000)
- **Number of Shares:** Auto-calculated based on current share price
  - Formula: `Shares = Amount ÷ Share Price`
  - Updates automatically as you type amount
- **Fine (₹):** Optional fine amount (shown only after 15th of month)
- **Current Share Price:** Fetched from monthly share price table
  - Shows share price for the specific month (e.g., January 2025)
  - If not set, shows error message with red border
  - Investment cannot proceed without share price
- **System Receipt:** Auto-generated receipt number
  - Format: `MMYY-NNNN` (e.g., 0125-0001 for Jan 2025, 1st investment)
  - Can be edited by admin if needed

**Calculation Example:**
> Month: January 2025
> Amount: ₹2,000
> Share Price: ₹30 (from January 2025 pricing)
> Shares Calculated: 2000 ÷ 30 = 66.67 shares
> Fine: ₹50 (if late payment)
> Receipt: 0125-0003

**Special Case - Company Member:**
- If member is "Company Account" (Member-ID: 2025-002)
- Investment also recorded in `company_transactions` table
- Helps track company's own investment activities separately

**After Saving:**
- Investment recorded in member's `activities` field
- Member's `total_shares` updated (cumulative)
- System navigates back to Member Detail page
- Green box appears showing investment details

### 2. Withdrawal Activity

**Purpose:** Process member withdrawal of invested amount

**Process:**

1. **Current Information Displayed:**
   - Present share price (from current month)
   - Total shares owned by member
   - Total value of shares (shares × share price)

2. **Enter Withdrawal Details:**
   - **Amount to withdraw (₹):** Enter withdrawal amount

3. **Auto-Calculations Shown:**
   - Shares to withdraw = Amount ÷ Share Price
   - Amount available after withdrawal
   - Remaining shares after withdrawal

4. **Validation:**
   - Cannot withdraw more than available shares
   - Share price must be set for current month
   - Shows error if withdrawal exceeds balance

5. **Approval Process:**
   - Click "Approve" button
   - System shows confirmed values
   - Click "Confirm" to process
   - Or "Deny" to cancel

**Withdrawal Example:**
> Member has: 100 shares
> Share Price: ₹35
> Total Value: ₹3,500
> 
> Withdrawal request: ₹1,500
> Shares to deduct: 1500 ÷ 35 = 42.86 shares
> 
> After withdrawal:
> Remaining shares: 57.14 shares
> Remaining value: ₹2,000

**After Processing:**
- Withdrawal recorded in activities
- Shares deducted from total_shares
- Status shown as "Withdrawn: ₹X" in red
- Cannot be reversed (no undo feature)

### 3. Dividend (Future Feature)

**Status:** Placeholder for future dividend payment tracking
- Currently shows "No fields yet. Future implementation"
- Will be used to record dividend distributions to members

### Important Notes:

**Monthly Activity Rules:**
1. Only one investment allowed per month
2. Withdrawals can be made anytime (but only in current month)
3. Share price must be set before any activity
4. Receipt numbers are auto-generated and sequential
5. All activities update member's total shares immediately
6. Past months are view-only, cannot edit/add
7. Fine field appears only after 15th of month

**Data Structure:**
- Activities stored under: `activities[year][month][investment/withdrawal]`
- Each activity includes:
  - Type (investment/withdrawal)
  - Amount
  - Shares
  - Share Price
  - Timestamp
  - Receipt/Reference number

---

## Share Price Management

**Purpose:** Set and manage monthly share prices used for share allocation

**How It Works:**

### Update Existing Month Section

**Purpose:** Update share price for a specific month

**Fields:**
1. **Current Share Price:** Shows existing price (read-only, amber background)
2. **Updated Share Price (₹):** Enter new price if updating

**How to Use:**
- Select year and month from dropdowns at the top of "Add New Monthly Share Price" section
- System displays current price if already set for that month
- Enter new price if updating
- Click "Update Price" button
- Updates or creates price record for that specific month

### Add New Monthly Share Price Section

**Purpose:** Create share price for a new month

**Fields:**
1. **Year:** Select year (current year and 5 years back)
2. **Month:** Select any month (Jan-Dec)
3. **Price (₹):** Enter share price amount

**Process:**
- Each month has its own independent share price
- Price stored with year and month (e.g., year=2025, month="Jan")
- Cannot add duplicate price for same year and month
- Shows error if attempting duplicate entry

**Example:**
> Setting price for January 2025:
> - Year: 2025
> - Month: Jan
> - Price entered: ₹30
> - Saved as: year=2025, month="Jan", price=30
> 
> Setting price for February 2025:
> - Year: 2025
> - Month: Feb
> - Price entered: ₹32
> - Saved as: year=2025, month="Feb", price=32

### Share Prices History Table

**Displays:**
- Year and Month of each price setting
- Price in ₹ (formatted to 2 decimals)
- Created date (when price was set)
- Action buttons:
  - **Edit:** Click to modify price inline
  - **Delete:** Remove price entry (with confirmation)

**Edit Mode:**
- Click edit icon next to price
- Input field appears with current price
- Change value and click green checkmark to save
- Or click X to cancel editing
- Updates price and modification timestamp

**Delete Function:**
- Click delete icon (red)
- Confirmation dialog appears
- If confirmed, removes price from database
- Useful if price was set incorrectly

**Sorting:**
- Prices listed newest first
- Year descending, then month descending within year

### How Share Prices Are Used:

1. **In Monthly Investments:**
   - When member invests in any month
   - System looks up share price for that specific month
   - Fetches share price for that year and month
   - Calculates: `Shares = Investment Amount ÷ Share Price`

2. **In Withdrawals:**
   - Uses current month's price for withdrawals
   - Determines value of shares being withdrawn

3. **In Reports:**
   - Used for valuation calculations
   - Company valuation = Total Shares × Current Price

**Important Business Rules:**
1. Share price must be set before accepting investments for that month
2. Each month has its own independent share price
3. Price changes only affect future calculations, not past investments
4. Historical prices preserved for audit trail
5. Share price can vary month-to-month based on market conditions

**Example Timeline:**
> Jan 2025: Set price at ₹30
> - January investments use ₹30
> 
> Feb 2025: Set price at ₹31
> - February investments use ₹31
> 
> Mar 2025: Set price at ₹32
> - March investments use ₹32
> - Past investments in Jan remain at ₹30 per share
> - Past investments in Feb remain at ₹31 per share
> - Member who invested in Jan still has shares purchased at ₹30

---

## Company Financial Management

**Purpose:** Track all company income sources and manage company investments

**Page:** Company Owns Amount (Compamt.jsx)

### Overview Cards (Top Section)

#### 1. Total Registration Fees
- **Source:** Membership fees from all members
- **Amount:** ₹10,000 per member (standard)
- **Calculation:** Only paid amounts counted
  - If member paid in full: ₹10,000 added
  - If payment status is "Due": (Total - Due Amount) added
  - Example: Member owes ₹4,000, only ₹6,000 goes to company balance
- **Emoji Icon:** 💰 in emerald green

#### 2. Total Fines
- **Source:** Late payment fines and due amounts paid later
- **Components:**
  - Fines from monthly investments (when paid after 15th)
  - Due registration amounts when marked as "Paid"
- **Tracking:** Stored in activities under each investment
- **Emoji Icon:** ⚠️ in red

#### 3. Dividend Investment
- **Source:** Company's portion from Dividend Donation events
- **What It Is:** When members are ineligible for dividend (short holding period), their share of dividend pool goes to company
- **Calculation:** Automatically computed during dividend events
- **Emoji Icon:** 💰 in amber

#### 4. Available Balance
- **Formula:** `(Registration + Fines + Dividend) - Total Company Invested`
- **Color Coding:**
  - Green: Positive balance
  - Red: Deficit (if company invested more than collected)
- **Action:** "Invest Current Balance" button (more details below)
- **Emoji Icon:** 📊 in blue

### Summary Banner (Blue Gradient Card)

**Left Side:**
- **Total Company Income:** Sum of all three income sources
- **Breakdown Display:** Shows Registration + Fines + Dividends

**Right Side:**
- **Total Invested:** Amount company has already invested
- **Invest Current Balance Button:**
  - Only enabled if balance > 0
  - Disabled (grayed) if balance ≤ 0
  - Shows "Investing..." while processing

### Detailed Tables

#### 1. Registration Payments Table (Emerald Header)

**Purpose:** Track all membership fee payments

**Columns:**
- Member (name with avatar)
- Contact (phone number)
- Membership ID
- Joined (date of joining)
- Amount (paid amount, not total - excludes dues)

**Features:**
- Shows member count badge
- Avatar with first letter of name
- Membership ID in blue badge
- Green color scheme
- Empty state: "No registration payments" with icon

**Financial Note:**
> If a member's payment is marked "Due":
> - Total Amount: ₹10,000
> - Due Amount: ₹4,000
> - Amount in table: ₹6,000 (10,000 - 4,000)
> - Only ₹6,000 added to company balance

#### 2. Investment Transactions Table (Blue Header)

**Purpose:** Track company's own investment activities

**Columns:**
- Date (transaction date)
- Member (Company Account name with avatar)
- Type (investment)
- Amount (negative in red, deducted from balance)
- Fine (fine amount if applicable)
- Receipt (transaction reference number)

**Features:**
- Shows transaction count badge
- Amount shown as negative (e.g., -₹50,000) in red
- Receipt format: `AUTO-BAL-{timestamp}` for auto-investments
- Sorted newest first
- Empty state: "No investment transactions" with icon

**Created When:**
- Admin clicks "Invest Current Balance" button
- Company balance invested in shares
- Recorded under Company Account member (ID: 2025-002)

#### 3. Dividend Donation Events Table (Amber Header)

**Purpose:** Track dividend events that created company investment

**Columns:**
- Event (name with avatar)
- Date (event date)
- Share Price (₹ per share at event time)
- Distribution (total distribution pool amount)
- Company Investment (amount allocated to company - in amber)
- Shares (shares purchased with that amount)
- Status (confirmed/completed)

**Features:**
- Shows event count badge
- Event name with first letter avatar
- Share price and distribution in gray
- Company investment highlighted in amber/gold
- Status badge color-coded (green for confirmed)
- Empty state: "No dividend donation events" with icon

**How Values Are Set:**
- Created during Dividend Donation event
- Company investment = Ineligible members' portion
- Shares = Company Investment ÷ Share Price at event

#### 4. Fine Collection Table (Red Header)

**Purpose:** Detailed breakdown of all fines collected

**Columns:**
- Member (name with avatar)
- Contact (phone number)
- Period (Year and Month)
- Fine Amount (in red)

**Sources of Fines:**
1. **Monthly Investment Fines:**
   - From `activities[year][month].investment.fine`
   - Collected when payment made after 15th of month

2. **Due Payment Fines:**
   - When registration due amount marked as paid
   - Stored as virtual fine entry with due payment date

**Features:**
- Shows fine count badge
- Period displayed in gray badge (e.g., "Jan 2025")
- Fine amount in red/bold
- Red color scheme throughout
- Empty state: "No fines recorded" with checkmark icon
- Sorted by year and month

### "Invest Current Balance" Button - Detailed Flow

**Trigger:** Admin clicks the prominent button in summary banner

**Prerequisites Check:**
1. Available balance must be > 0
2. Current month's share price must be set
3. Company Account member must exist (Member-ID: 2025-002)

**Step-by-Step Process:**

**Step 1: Validate Share Price**
- Get current month and year (based on today's date)
- Query `share_prices` table for current year and month
- If not found: Show error "Share price not available for [Month] [Year]"
- If price ≤ 0: Show error "Share price not set for [Month] [Year]"
- Stop process and return

**Step 2: Find/Create Company Member**
- Search for member with membershipId = "2025-002"
- If not found: Auto-create Company Account member
  - Name: "Company Account"
  - Phone: "0000000000"
  - Total Shares: 0
  - Payment status: Paid
  - Membership ID: 2025-002

**Step 3: Calculate Investment**
```
Amount to Invest = Current Balance
Shares to Purchase = Amount ÷ Current Share Price
```

**Example:**
> Current Balance: ₹65,000
> Share Price: ₹30
> Shares: 65,000 ÷ 30 = 2,166.67 shares

**Step 4: Create Transaction Record**
- Insert into `company_transactions` table:
  - Member ID: Company member's ID
  - Member Name: "Company Account"
  - Membership ID: "2025-002"
  - Type: "investment"
  - Amount: Full balance amount
  - Fine: Total fine amount (for reference)
  - Year: Current year
  - Month: Current month (short form, e.g., "Jan")
  - Custom Receipt: `AUTO-BAL-{timestamp}`
  - Share Price: Current price
  - Shares: Calculated shares
  - Description: "Auto-invest company balance (Reg: ₹X + Fines: ₹Y) - Month Year"

**Step 5: Update Company Member Record**
- Add investment to activities structure:
```
activities[current_year][current_month].investment = {
  type: 'investment',
  amount: balance amount,
  shares: calculated shares,
  sharePrice: current price,
  customReceipt: 'AUTO-BAL-{timestamp}',
  createdAt: current timestamp
}
```
- Merge with existing investments if any for the month
- Recalculate total_shares from all activities
- Update company member's total_shares field

**Step 6: Success & Refresh**
- Show success alert: "Company balance invested successfully! Amount: ₹X (Registration: ₹Y + Fines: ₹Z)"
- Real-time listeners automatically refresh all data
- Available Balance becomes ₹0
- New transaction appears in Investment Transactions table
- Company member's shares updated in system

**Real-World Scenario:**
> Company has:
> - ₹50,000 from 5 registrations
> - ₹3,000 from fines
> - ₹12,000 from dividend events
> - Already invested: ₹30,000
> - **Available: ₹35,000**
>
> Admin clicks button:
> 1. Current share price: ₹32
> 2. Shares to buy: 35,000 ÷ 32 = 1,093.75 shares
> 3. Transaction created with receipt: AUTO-BAL-1710847234567
> 4. Company member gains 1,093.75 shares
> 5. Available balance shows ₹0
> 6. Total invested shows ₹65,000 (30,000 + 35,000)

### Business Logic Explained

**Why Track Company Balance?**
- Registration fees and fines don't belong to any individual member
- This money is company's working capital
- Company invests this capital to become a shareholder itself
- Company shares grow just like member shares
- Company can participate in profit distribution

**Segregated Accounting:**
1. **Income Side:**
   - Registration fees → Company income
   - Fines → Company income
   - Dividend donation portions → Company income

2. **Investment Side:**
   - Company invests its balance
   - Gets shares like regular members
   - Tracked under special "Company Account" member

3. **Balance Logic:**
   - Income - Investments = Available Balance
   - Balance ready to invest anytime
   - One-click investment process

**Example Balance Evolution:**
```
Month 1:
  Registration: ₹10,000
  Fines: ₹0
  Available: ₹10,000

Admin invests ₹10,000 → Gets 333 shares (at ₹30/share)

Month 2:
  Registration: ₹20,000 (2 new members)
  Fines: ₹1,000
  Available: ₹21,000 (₹21,000 income - ₹10,000 invested)

Admin invests ₹21,000 → Gets 700 shares (at ₹30/share)

Month 3:
  Dividend event: ₹15,000 to company
  Available: ₹15,000
  
Company now has: 333 + 700 = 1,033 shares
Available to invest: ₹15,000
```

### Real-Time Updates

**Technology:** Supabase real-time subscriptions

**What Auto-Refreshes:**
- Registration payments (when new members join)
- Fines (when investments with fines are recorded)
- Company transactions (when investments made)
- Dividend events (when dividend donations processed)
- All cards and totals recalculate automatically

**Benefits:**
- No manual refresh needed
- Multiple admins can work simultaneously
- Always see latest data
- Instant feedback on all actions

---

## Dividend Donation System

**Purpose:** Identify members eligible for profit-sharing based on shareholding tenure

**Page:** Dividend Donation (Dividend.jsx)

**Important:** This is an **informational page only** - it shows WHO qualifies, not actual distribution amounts.

### How It Works

#### Step 1: Set Filter Criteria

**Configuration Panel (Top Section):**

1. **Event Date**
   - Select the date for checking eligibility
   - Defaults to today's date
   - Used to calculate how long each member has held shares

2. **Minimum Holding Period (months)**
   - Dropdown options: 6, 12, 18, or 24 months
   - Default: 12 months
   - Business rule for eligibility

**Example Configuration:**
> Event Date: March 15, 2025
> Minimum Period: 12 months
> → Only members who joined before March 15, 2024 qualify

#### Step 2: Click "Show Eligible Members"

**What Happens:**
- System fetches all members
- For each member:
  - Gets joining date from `payment.dateOfJoining`
  - Calculates months between joining date and event date
  - Checks if member has shares (`total_shares > 0`)
  - Determines eligibility: `months_held ≥ minimum_months AND shares > 0`

**Eligibility Formula:**
```
Months Held = (Event Year - Joining Year) × 12 + (Event Month - Joining Month)

Eligible IF:
  - Months Held ≥ Minimum Holding Months
  - Total Shares > 0
  - Has valid joining date
```

#### Step 3: View Results

**Three Summary Cards:**

1. **Total Members:** All members in system
2. **Eligible Members:** Count in green
3. **Ineligible Members:** Count in red

### Eligible Members Table (Green Section)

**Purpose:** List all members who qualify for dividend

**Columns Displayed:**
1. **Member ID:** Membership identification number
2. **Name:** Member's full name
3. **Mobile Number:** Contact number
4. **Email:** Email address
5. **Joining Date:** When member joined (formatted)
6. **Months Held:** Calculated holding period
7. **Total Shares:** Number of shares owned

**Visual Design:**
- Green header with "Eligible Members (X)" title
- Subtitle: "Members who meet the minimum holding period of X months"
- Clean table layout with hover effects
- All contact details readily available

**Example Row:**
```
Member ID: 2025-001
Name: John Doe
Mobile: 9876543210
Email: john@example.com
Joining Date: Jan 15, 2024
Months Held: 14 months
Total Shares: 250.50
```

### Ineligible Members Table (Red Section)

**Purpose:** List members who don't qualify and explain why

**Columns Displayed:**
1. **Member ID**
2. **Name**
3. **Mobile Number**
4. **Email**
5. **Joining Date**
6. **Months Held**
7. **Reason:** Why they're ineligible

**Reasons Shown:**
- "No shares" - Member hasn't made any investments
- "No joining date" - Missing joining date in records
- "Only X months" - Haven't completed minimum holding period

**Visual Design:**
- Red header with "Ineligible Members (X)" title
- Subtitle: "These members do not meet the minimum holding period of X months"
- Reason column in red text
- Informative feedback for each member

**Example Row:**
```
Member ID: 2025-015
Name: Jane Smith
Mobile: 9123456789
Email: jane@example.com
Joining Date: May 10, 2024
Months Held: 10 months
Reason: Only 10 months
```

### Reset Button

**Purpose:** Clear results and start new eligibility check

**Function:**
- Clears eligible/ineligible lists
- Keeps filter settings (date and months)
- Allows checking with different criteria

### Use Cases

**Use Case 1: Annual Dividend Distribution**
> Company decides to distribute year-end profits
> Admin sets:
> - Event Date: Dec 31, 2024
> - Min Period: 12 months
> 
> Gets list of all members who:
> - Joined before Dec 31, 2023
> - Have shares
> 
> Uses this list for:
> - Calculating dividend amounts (externally)
> - Making payments
> - Record keeping

**Use Case 2: Special Bonus Distribution**
> Company has extra profits to distribute
> Wants to reward long-term investors
> Admin sets:
> - Event Date: Today
> - Min Period: 24 months
> 
> Gets exclusive list of 2+ year members
> Makes special payments to encourage long-term investment

**Use Case 3: Eligibility Verification**
> Member asks if they qualify for upcoming dividend
> Admin checks:
> - Sets member's joining date context
> - Views their status (eligible/ineligible)
> - Explains reason to member

### Key Business Rules

1. **Holding Period Calculation:**
   - Based on joining date, not first investment date
   - Counts full months only
   - If joined on any day of month, that month counts

2. **Share Requirement:**
   - Must have at least some shares (> 0)
   - Amount doesn't matter for eligibility
   - Zero shares = automatic ineligibility

3. **Data Requirements:**
   - Valid joining date mandatory
   - Missing joining date = ineligible
   - Email and phone should be present for contact

4. **No Financial Calculations:**
   - Page doesn't calculate dividend amounts
   - Doesn't process payments
   - Purely informational for admin reference
   - Actual distribution done externally

### Example Scenarios

**Scenario 1: Simple Eligibility**
```
Event Date: Mar 1, 2025
Min Period: 12 months

Member A:
  Joined: Jan 15, 2024
  Months: 13 months (✓)
  Shares: 150 (✓)
  Result: ELIGIBLE

Member B:
  Joined: Jun 20, 2024
  Months: 8 months (✗)
  Shares: 200 (✓)
  Result: INELIGIBLE (Only 8 months)
```

**Scenario 2: Edge Cases**
```
Event Date: Apr 1, 2025
Min Period: 12 months

Member C:
  Joined: Apr 1, 2024
  Months: 12 months exactly (✓)
  Shares: 50 (✓)
  Result: ELIGIBLE

Member D:
  Joined: Feb 10, 2023
  Months: 25 months (✓)
  Shares: 0 (✗)
  Result: INELIGIBLE (No shares)

Member E:
  Joined: (missing)
  Months: N/A (✗)
  Shares: 100 (✓)
  Result: INELIGIBLE (No joining date)
```

### Practical Workflow

**Admin's Process:**
1. Open Dividend Donation page
2. Set event date (when dividend will be given)
3. Set minimum holding period (company policy)
4. Click "Show Eligible Members"
5. Review both tables
6. Export or note down eligible members' details
7. Process payments externally (bank transfer, cash, etc.)
8. Update company records outside system
9. Reset and check again if needed for different criteria

**What Admin Gets:**
- Clear list of who qualifies
- Contact details for all eligible members
- Reasons for ineligibility (to inform members)
- Member-wise shareholding information
- Joining date history for verification

---

## Membership Refund

**Purpose:** Settle ₹10,000 membership fee refunds for members

**Business Rule:** Members become automatically eligible for ₹10,000 membership fee refund after completing 5 years from joining date. However, admins can settle refunds anytime before 5 years if needed (early settlement).

### Page Layout

#### Summary Cards (Top Section)

Shows three key metrics with color-coded cards:

1. **Eligible for Refund (Green)**
   - Count of members who completed 5 years
   - Automatically qualified for refund
   - Ready for settlement

2. **Pending - Under 5 Years (Yellow)**
   - Count of members still within 5 years
   - Can still be settled manually if needed
   - Shows countdown to 5 years

3. **Settled (Blue)**
   - Count of members whose refunds are settled
   - Historical record
   - Shows "Settled" button (disabled)

### Three Tables

#### 1. Eligible for Refund Table (Green Header)

**Purpose:** Settle refunds for members who completed 5 years

**Columns:**
- **Member:** Name and phone number
- **Membership ID:** Member's unique identifier
- **Joining Date:** When member joined
- **Years Since Joining:** Calculated tenure (e.g., "5.2 years")
- **Actions:** "Settle" button

**Eligibility Calculation:**
```javascript
Joining Date: Member's dateOfJoining
Five Years Later: Joining Date + (365 × 5) days
Today: Current date

IF Today ≥ Five Years Later:
  → ELIGIBLE for refund (green table)
```

**Settle Button:**
- Green button with checkmark icon
- Clicking shows confirmation dialog
- Dialog message: "Settle refund of ₹10,000 for [Name]? Member has completed X.X years and is eligible for refund."

**On Confirmation:**

**Step 1: Update Member Record**
- Updates member's `payment` object:
  - `membershipRefunded`: true
  - `refundDate`: Current timestamp
  - `refundAmount`: 10000
  - `settledEarly`: true/false (based on if < 5 years)

**Step 2: Create Transaction Record**
- Inserts into `company_transactions` table:
  - Type: "membership_refund"
  - Amount: 10000 (deducted from company balance)
  - Member details
  - Receipt: `REFUND-{timestamp}`
  - Description: "Membership refund settled for [Name] - X.X years after joining"
  - Current year and month

**Step 3: Success & Refresh**
- Shows success message with member details and years
- Member moves to "Settled" table
- Company balance reduced by ₹10,000
- Transaction appears in Company Owns Amount page

**Example:**
> Member: John Doe
> Joined: Jan 15, 2020
> Years Since: 5.1 years
> Today: Feb 18, 2025
> 
> Admin clicks "Settle"
> Confirmation: "Member has completed 5.1 years and is eligible for refund"
> ✓ Confirms
> 
> System:
> - Marks member as settled
> - Deducts ₹10,000 from company balance
> - Creates transaction REFUND-1710847234567
> - Shows in Settled table with "Settled" button
> 
> Result:
> ✓ Member removed from eligible list
> ✓ Company balance reduced
> ✓ Transaction recorded for audit

#### 2. Pending Members Table (Yellow Header)

**Purpose:** Show members under 5 years who can still be settled manually

**Columns:**
- **Member:** Name and phone
- **Membership ID**
- **Joining Date**
- **Years Since Joining:** Current tenure (e.g., "2.5 years")
- **Days Until 5 Years:** Countdown to automatic eligibility
- **Actions:** "Settle" button

**Calculation:**
```javascript
Joining Date: Member's dateOfJoining
Five Years Later: Joining Date + (365 × 5) days
Today: Current date

Days Until Eligible = Five Years Later - Today

IF Days > 0:
  → Show in Pending table
  → Display days remaining
  → Show "Settle" button
```

**Visual Design:**
- Yellow/amber color scheme
- Subtitle: "Members who haven't completed 5 years yet - can still be settled manually"
- Amber "Settle" button available for each member
- Shows both years completed and days remaining

**Settle Button (Early Settlement):**
- Amber button with checkmark icon
- Clicking shows warning confirmation
- Dialog message: "Settle refund of ₹10,000 for [Name]? Note: Member has only completed X.X years (less than 5 years). Are you sure you want to settle now?"
- Admin must confirm intentional early settlement
- Same process as eligible members, but flagged as `settledEarly: true`

**Example Rows:**
```
Member: Jane Smith
Membership ID: 2025-025
Joining Date: Sep 10, 2022
Years Since: 2.4 years
Days Until 5 Years: 936 days
[Settle Button] ← Can settle early if needed

Member: Mike Johnson
Membership ID: 2025-030
Joining Date: Dec 1, 2023
Years Since: 1.2 years
Days Until 5 Years: 1,389 days
[Settle Button] ← Can settle early if needed
```

#### 3. Settled Members Table (Blue Header)

**Purpose:** Historical record of settled refunds

**Columns:**
- **Member:** Name and phone
- **Membership ID**
- **Joining Date**
- **Settled Date:** When refund was settled
- **Refund Amount:** ₹10,000 (green text)
- **Status:** "Settled" button (disabled, blue)

**Visual Design:**
- Blue color scheme
- Subtitle: "Members whose refunds have been settled"
- "Settled" button displayed (disabled state)
- Archive/record keeping

**Example Rows:**
```
Member: Sarah Williams
Membership ID: 2020-005
Joining Date: Oct 5, 2019
Settled Date: Oct 8, 2024
Refund Amount: ₹10,000.00
Status: [Settled] ← Disabled button

Member: David Brown (Early Settlement)
Membership ID: 2023-012
Joining Date: Nov 20, 2023
Settled Date: Jan 15, 2025
Refund Amount: ₹10,000.00
Status: [Settled] ← Settled before 5 years
```

### Business Logic Details

**Automatic Categorization:**
```
For Each Member in System:
  
  IF membershipRefunded = true:
    → Add to SETTLED table
    → Show "Settled" button (disabled)
    → Skip eligibility check
  
  ELSE:
    Calculate: Years Since Joining
    
    IF Years >= 5:
      → Add to ELIGIBLE table
      → Show green "Settle" button
    
    ELSE:
      → Add to PENDING table
      → Calculate days remaining
      → Show amber "Settle" button (early settlement option)
```

**Settlement Impact on Finances:**
```
Before Settlement:
  Company Balance: ₹50,000
  Member joins, pays ₹10,000
  Company Balance: ₹60,000

After 5 Years (or anytime if settled early):
  Member requests refund
  Admin settles: -₹10,000
  Company Balance: ₹50,000

Net Impact: ₹0 (returned member's money)
```

**Why This System?**
- Encourages long-term commitment (₹10,000 fee, 5 years standard)
- Member gets refund after showing commitment (5 years)
- Company uses the float during first 5 years
- After 5 years, member becomes true long-term investor
- Flexibility: Admin can settle early if circumstances require
- Reduces barrier for new members (refundable deposit)
- `settledEarly` flag helps track early settlements for analysis

### Real-World Scenarios

**Scenario 1: Standard Settlement (After 5 Years)**
```
Month: January 2025
Eligible: 8 members (all joined in Jan 2020)

Admin process:
1. Opens Membership Refund page
2. Sees 8 members in Eligible table (all showing 5+ years)
3. Settles refunds one by one
4. Each settlement:
   - Click "Settle" button
   - Confirmation: "Member has completed X.X years and is eligible"
   - ✓ Confirm
   - ₹10,000 deducted
   - Transaction created
5. All 8 move to Settled table with "Settled" button
6. Company balance reduced by ₹80,000
```

**Scenario 2: Early Settlement (Before 5 Years)**
```
Member situation: Financial hardship, needs refund urgently
Joined: Mar 10, 2022 (only 2.9 years ago)
Today: Feb 18, 2025

Admin process:
1. Opens Membership Refund page
2. Finds member in Pending table
3. Shows: "2.9 years" and "763 days until 5 years"
4. Clicks amber "Settle" button
5. Warning dialog: "Member has only completed 2.9 years (less than 5 years). Are you sure?"
6. Admin confirms (board approved early settlement)
7. Settlement processed
8. Flagged as settledEarly: true
9. Member moves to Settled table
10. Company balance reduced by ₹10,000

Result: Member gets refund early, flagged in system
```

**Scenario 3: Member Inquiry**
```
Member calls: "When can I get my ₹10,000 back?"

Admin checks:
- Opens Membership Refund page
- Finds member in Pending table
- Joining Date: Sep 15, 2022
- Years Since: 2.4 years
- Days Until 5 Years: 936 days
- Informs member: "You'll be automatically eligible in about 2.6 years (June 2027)"
- Also mentions: "But we can settle early if you have special circumstances"

Member satisfied with clear timeline and flexibility option.
```

**Scenario 4: Already Settled Member**
```
Member claims: "I never got my refund!"

Admin verifies:
- Opens Membership Refund page
- Searches Settled table
- Finds record:
  - Settled Date: Oct 10, 2024
  - Amount: ₹10,000.00
  - Status: Settled (blue button)
- Checks company transactions for REFUND-{timestamp}
- Confirms settlement was processed
- Provides proof to member with transaction receipt

Member remembers and apologizes.
```

### Important Notes

**Settlement vs. Withdrawal Difference:**
- **Refund Settlement:** Returns membership fee (₹10,000)
  - Member keeps all shares
  - Can continue investing
  - One-time process (eligible after 5 years, can settle anytime)
  - Tracked with `settledEarly` flag if done before 5 years
  
- **Withdrawal:** Liquidates shares
  - Converts shares back to cash
  - Reduces member's shareholding
  - Can be done anytime
  - Different from refund

**Data Integrity:**
- Once settled, member cannot be settled again
- `membershipRefunded` flag is permanent
- Settlement date preserved for audit
- `settledEarly` flag tracks early settlements
- Transaction record immutable
- Can track all settlements in company transactions

**Financial Tracking:**
- Settlements reduce company's available balance
- Shown as outgoing transaction
- Separate from regular withdrawals
- Type clearly marked as "membership_refund"
- Easy to generate settlement reports
- Early settlements flagged for analysis

**Early Settlement Tracking:**
- `settledEarly: true` if settled before 5 years
- `settledEarly: false` if settled after 5 years
- Transaction description includes years since joining
- Helps identify patterns and special cases

---

## Reports & Analytics

**Purpose:** Generate comprehensive Excel reports for various business needs

**Page:** Reports (Reports.jsx)

### Nine Report Types Available

#### 1. Dividend Report

**Purpose:** Member shareholding and dividend eligibility

**What It Includes:**
- S. No. (serial number)
- Member ID
- Member Name
- Phone Number
- Date of Joining
- Total Shares
- Current Share Price
- Total Value (shares × price)
- Investment Date
- Shares Allotment Date
- Dividend Eligibility (Eligible/Not Eligible)
- Report Month and Year

**When to Use:**
- Before dividend distribution
- To identify shareholders
- For dividend calculations
- Audit and compliance

**Configuration:**
- Select Year
- Select Month
- Uses latest share price for that year

**File Name:** `dividend_report_YYYY_MMM.xlsx`

**Example Output:**
```
S.No. | Member ID | Name      | Phone      | Shares | Price | Value   | Eligibility
1     | 2025-001  | John Doe  | 9876543210 | 250.50 | ₹30   | ₹7,515  | Eligible
2     | 2025-002  | Jane Smith| 9123456789 | 0      | ₹30   | ₹0      | Not Eligible
```

#### 2. Company Valuation Report (Consolidated Report)

**Purpose:** Overall company financial summary and market value

**What It Includes:**
- Report Type: "COMPANY VALUATION REPORT"
- Total Members count
- Total Shares Outstanding
- Total Investment Amount (all member investments)
- Current Share Price
- Company Valuation (Market Value = Shares × Price)
- Report Month and Year
- Report Generation Date

**When to Use:**
- Monthly/quarterly board meetings
- Financial statements
- Valuation assessments
- Investment decisions
- Stakeholder reporting

**Configuration:**
- Select Year
- Select Month
- Uses latest share price

**File Name:** `company_valuation_report_YYYY_MMM.xlsx`

**Example Output:**
```
Report Type: COMPANY VALUATION REPORT
Total Members: 50
Total Shares Outstanding: 12,500.75
Total Investment Amount: ₹365,000
Current Share Price: ₹30
Company Valuation: ₹375,022.50
Report Month: Mar
Report Year: 2025
Report Date: 3/15/2025
```

#### 3. Directors Valuation Report (Directors Report)

**Purpose:** Share price history approved by directors

**What It Includes:**
- S. No.
- Year
- Share Price
- Valuation Date
- Status (Latest/Previous)
- Notes: "Directors approved valuation"
- Report Month

**When to Use:**
- Board meetings
- Price history tracking
- Director approvals documentation
- Regulatory compliance
- Annual reports

**Configuration:**
- Select Year (filters prices for that year)
- Select Month (for report context)

**File Name:** `directors_report_YYYY_MMM.xlsx`

**Example Output:**
```
S.No. | Year | Share Price | Valuation Date | Status   | Notes
1     | 2025 | ₹32.00     | 1/15/2025     | Latest   | Directors approved
2     | 2024 | ₹30.00     | 10/10/2024    | Previous | Directors approved
3     | 2024 | ₹28.00     | 7/5/2024      | Previous | Directors approved
```

#### 4. Complete System Report (Fetch All Details)

**Purpose:** Comprehensive export of all system data

**What It Includes:**
Three separate sheets in one workbook:

**Sheet 1: All Members**
- S. No., Member ID, Name, Phone
- Total Shares, Payment Status
- Created Date

**Sheet 2: All Transactions**
- S. No., Date, Type
- Amount, Description

**Sheet 3: Share Prices**
- S. No., Year, Price, Date

**When to Use:**
- System backup
- Data migration
- Comprehensive audits
- Annual archival
- System analysis

**Configuration:**
- Select Year (for context, exports all data)

**File Name:** `all_details_report_YYYY.xlsx`

**Benefits:**
- Complete system snapshot
- Multiple data types in one file
- Easy to archive
- Comprehensive audit trail

#### 5. Share Distribution Report (Consolidated Shares)

**Purpose:** Member ownership percentages and share breakdown

**What It Includes:**
- S. No.
- Member ID
- Member Name
- Total Shares
- Share Percentage (of total company shares)
- Investment Status (Active/No Investment)
- Report Month and Year
- Total Company Shares

**When to Use:**
- Ownership analysis
- Voting rights calculation
- Profit distribution planning
- Equity reports
- Member communication

**Configuration:**
- Select Year
- Select Month

**File Name:** `share_distribution_report_YYYY_MMM.xlsx`

**Example Output:**
```
S.No. | Member ID | Name       | Shares  | Percentage | Status | Total Shares
1     | 2025-001  | John Doe   | 250.50  | 2.00%     | Active | 12,525
2     | 2025-002  | Jane Smith | 180.25  | 1.44%     | Active | 12,525
3     | 2025-003  | Mike Brown | 0       | 0.00%     | No Inv.| 12,525
```

#### 6. Company Funds Report (Total Company Pooled)

**Purpose:** Company funds within custom date range

**What It Includes:**
- Report Period (start date to end date)
- Total Company Pooled Amount
- Number of Transactions
- Average Transaction Amount
- Report Generation Date

**When to Use:**
- Custom period analysis
- Quarterly summaries
- Specific date range audits
- Cash flow analysis

**Configuration:**
- Select Start Date
- Select End Date
- Year and Month fields ignored

**File Name:** `company_pooled_amount_YYYY-MM-DD_to_YYYY-MM-DD.xlsx`

**Example Output:**
```
Report Period: 1/1/2025 to 1/31/2025
Total Company Pooled Amount: ₹85,000
Number of Transactions: 17
Average Transaction: ₹5,000.00
Report Generated: 2/14/2025
```

#### 7. Monthly Audit Report (Monthly Funding Audit)

**Purpose:** Audit-ready monthly investment verification form

**What It Includes:**
- S. No.
- Member ID
- Member Name
- Investment Amount
- Fine Amount
- Total Amount
- Receipt Number
- Physical Verification (blank - for manual entry)
- Audit Signature (blank - for manual entry)
- Date of Verification (blank - for manual entry)

**When to Use:**
- Monthly audits
- Physical verification processes
- Receipt reconciliation
- Compliance documentation
- Internal controls

**Configuration:**
- Select Year
- Select Month

**File Name:** `monthly_funding_audit_YYYY_MMM.xlsx`

**Special Features:**
- Blank columns for auditor signatures
- Ready for printing and manual filling
- Receipt numbers for cross-verification
- Member-wise breakdown

**Example Output:**
```
S.No | ID      | Name       | Inv.    | Fine | Total   | Receipt    | Verified | Signature | Date
1    | 2025-01 | John Doe   | ₹2,000  | ₹50  | ₹2,050  | 0125-0001 |          |           |
2    | 2025-02 | Jane Smith | ₹2,000  | ₹0   | ₹2,000  | 0125-0002 |          |           |
```

#### 8. Current Month Shares Report (New Shares Current)

**Purpose:** New shares issued in selected month

**What It Includes:**
- Report Month (Month Year)
- Current Month New Shares (issued this month)
- Cumulative Total Shares (all shares ever issued)
- Previous Month Shares (total before this month)
- Growth Rate (percentage increase)

**When to Use:**
- Monthly growth tracking
- Share issuance monitoring
- Board reporting
- Growth analysis

**Configuration:**
- Select Year
- Select Month

**File Name:** `new_shares_current_YYYY_MMM.xlsx`

**Example Output:**
```
Report Month: Jan 2025
Current Month New Shares: 156.75
Cumulative Total Shares: 2,500.50
Previous Month Shares: 2,343.75
Growth Rate: 6.69%
```

#### 9. Monthly Shares Report (New Shares Monthwise)

**Purpose:** Month-by-month share issuance breakdown for entire year

**What It Includes:**
- S. No.
- Month Name
- Year
- New Shares Issued (for that month)
- Cumulative Shares (running total)

**When to Use:**
- Annual reviews
- Year-end reports
- Growth trend analysis
- Monthly comparison
- Investment patterns

**Configuration:**
- Select Year (analyzes all 12 months)
- Month field ignored

**File Name:** `new_shares_monthwise_YYYY.xlsx`

**Example Output:**
```
S.No | Month | Year | New Shares | Cumulative
1    | Jan   | 2025 | 125.50    | 125.50
2    | Feb   | 2025 | 145.75    | 271.25
3    | Mar   | 2025 | 156.25    | 427.50
... (continues for all 12 months)
```

### How to Generate Reports

**Step-by-Step Process:**

1. **Navigate to Reports Page**
   - From Admin Dashboard, click "Reports" tile

2. **Select Report Type**
   - Dropdown shows all 9 report types
   - Each option shows descriptive name
   - Hover to see description below

3. **Configure Parameters**
   - **Year:** Select from dropdown (current year and 5 years back)
   - **Month:** Select month (if required for report type)
   - **Date Range:** Set start and end dates (for Company Funds report only)

4. **Review Description**
   - Small text below dropdown explains what report contains
   - Helps confirm correct report selected

5. **Click Generate Button**
   - Big amber button: "Generate & Download Report"
   - Shows "Generating..." while processing
   - Button disabled during generation

6. **Download File**
   - Excel file automatically downloads
   - File name includes report type, year, month/dates
   - Opens in Excel, Google Sheets, or compatible app

7. **Verify Data**
   - Check report contents
   - Verify date range or filters applied
   - Use for intended purpose

### Report Configuration Panel

**Visual Layout:**
- Clean two-column grid
- Dropdowns for year and month
- Date inputs for custom ranges
- Large generate button at bottom
- Real-time description updates

**Available Report Types Display:**
Grid of colorful cards showing:
- 💰 Dividend Report
- 📊 Company Valuation
- 👔 Directors Report
- 📋 Complete System
- 📈 Share Distribution
- 🏦 Company Funds
- 🔍 Monthly Audit
- 📊 Current Month Shares
- 📅 Monthly Shares

### Common Report Uses

**Monthly Routine:**
```
Beginning of Month:
1. Monthly Funding Audit Report
   - For last month
   - Give to auditor for verification

2. New Shares Current Report
   - For last month
   - Track growth

3. Company Valuation Report
   - For current month
   - Board meeting preparation
```

**Quarterly Routine:**
```
End of Quarter:
1. Share Distribution Report
   - Review ownership changes

2. Directors Valuation Report
   - Document approved price

3. Company Funds Report
   - 3-month date range
   - Cash flow analysis
```

**Annual Routine:**
```
End of Year:
1. Complete System Report
   - Full backup

2. New Shares Monthwise Report
   - Year-long analysis

3. Dividend Report (December)
   - Year-end dividend planning
```

**Ad-Hoc Requests:**
```
Member queries:
- Dividend Report (individual verification)
- Share Distribution (ownership proof)

Investor meetings:
- Company Valuation Report
- Share Distribution Report

Audits:
- Complete System Report
- Monthly Funding Audit (all months)
```

### Report Tips

**Best Practices:**
1. Generate monthly reports for record-keeping
2. Store reports in organized folders (by year/month)
3. Use consistent naming conventions
4. Keep audit reports with physical documents
5. Archive year-end reports separately
6. Use appropriate report for each purpose
7. Verify share prices set before generating valuation reports

**Data Accuracy:**
- Reports pull live data from database
- Share prices must be set for accurate valuations
- Member data should be up-to-date
- Run reports after data entry completion

**Excel Features:**
- Reports open in Excel/Google Sheets
- Can add filters, sorts, charts
- Modify layouts for presentations
- Add additional calculations
- Print directly or save as PDF

---

## Complete Workflow

### End-to-End System Flow

This section explains how all components work together in real-world scenarios.

### Workflow 1: New Member Onboarding

**Actors:** Admin, New Member
**Duration:** 15-20 minutes

**Steps:**

1. **Initial Contact**
   - Member expresses interest in joining
   - Admin explains investment scheme
   - Member agrees to terms

2. **Registration Process**
   
   **A. Personal Details (Step 1)**
   - Admin clicks "Add Member" tile from dashboard
   - Opens Personal Details form
   - Fills in:
     - Name, relation, age, gender
     - Phone (unique), email
     - Address, occupation
     - Blood group, marital status
     - Family members (optional)
     - Nominees (optional)
   - Validates all required fields
   - Clicks "Save & Next"
   - System saves data, stores phone as session ID

   **B. Insurance Details (Step 2)**
   - Auto-navigates to Insurance page
   - Fills insurance policy details:
     - Company, policy number
     - Start/end dates
     - Sum assured, premium
     - Nominee, agent details
   - Can add multiple policies
   - Clicks "Save & Next"

   **C. Payment Details (Step 3)**
   - Auto-navigates to Payment page
   - Sets membership amount (₹10,000)
   - Selects payment status:
     
     **Option A: Full Payment**
     - Status: "Paid"
     - Method: Cash/Online
     - Date of joining: Select date
     - System auto-generates Membership ID (e.g., 2025-025)
     - ₹10,000 goes to company balance immediately
     
     **Option B: Partial Payment**
     - Status: "Due"
     - Amount paying now: e.g., ₹6,000
     - Due amount: Auto-calculated (₹4,000)
     - Only ₹6,000 goes to company balance
     - Due tracked in member record
   
   - Clicks "Complete Registration"

3. **Post-Registration**
   - System navigates to Admin Dashboard
   - Success message shown
   - Member appears in Members directory
   - Registration amount (or partial) in Company Owns Amount
   - Member can now make monthly investments

**Result:**
- Member record created
- Phone number = unique identifier
- Membership ID assigned
- Insurance policies recorded
- Payment processed
- Member active in system

### Workflow 2: Monthly Investment Cycle

**Actors:** Admin, Multiple Members
**Duration:** Ongoing (throughout month)

**Beginning of Month (1st-5th):**

1. **Set Share Price (If New Month)**
   - Admin navigates to "Monthly Share Price"
   - Checks if current month has price set
   - If not:
     - Selects current year and month
     - Enters share price (e.g., ₹32)
     - Clicks "Add Price"
   - Price now available for investments

2. **Member Investment Collection**
   - Members come to office/pay online
   - Admin processes each investment

   **For Each Member:**
   
   **A. Navigate to Member Profile**
   - Open Members directory
   - Search member by name/phone
   - Click to open detail page

   **B. Record Investment**
   - Find current month in monthly list
   - Click "Activity" button
   - Select "Investment" radio button
   - System checks: already invested? (prevents duplicate)
   
   **C. Fill Investment Details**
   - Amount: e.g., ₹2,000
   - Shares: Auto-calculated (2000 ÷ 32 = 62.5)
   - Share Price: Auto-fetched (₹32)
   - Fine: (appears only after 15th) e.g., ₹50 if late
   - Receipt: Auto-generated (0125-0012)
   
   **D. Save Investment**
   - Click "Save"
   - Investment recorded
   - Member's total shares updated
   - Returns to member detail page
   - Green box shows investment success

   **E. Repeat for Next Member**

3. **Mid-Month (15th onwards)**
   - Fine field appears for late payments
   - Admin adds fine amount if payment late
   - Fine tracked separately in system

4. **End of Month**
   - Generate Monthly Funding Audit Report
   - Cross-verify all investments
   - Prepare for next month

**Result:**
- All active members have monthly investments
- Shares allocated based on current price
- Fines collected for late payments
- Company balance grows from fines
- Audit trail complete with receipts

### Workflow 3: Company Balance Management

**Actors:** Admin
**Duration:** Monthly/As needed

**Scenario:** Company has accumulated ₹45,000 from registrations and fines

1. **Check Company Balance**
   - Navigate to "Company Owns Amount" page
   - View summary cards:
     - Total Registration: ₹30,000 (3 new members)
     - Total Fines: ₹5,000 (late payment fines)
     - Dividend Investment: ₹10,000 (from last dividend event)
     - **Available Balance: ₹45,000**

2. **Review Breakdown**
   - Scroll through tables:
     - Registration Payments: 3 members listed
     - Fine Collection: 10 fine entries
     - Dividend Events: 1 event shown
     - Investment Transactions: Previous investments

3. **Decide to Invest**
   - Company policy: Invest balance monthly
   - Admin decides to invest available ₹45,000

4. **Execute Investment**
   - Click "Invest Current Balance" button
   - System validates:
     - ✓ Balance > 0 (₹45,000)
     - ✓ Share price set (₹32)
     - ✓ Company Account member exists
   - Confirmation dialog appears
   - Admin confirms

5. **Investment Processing**
   - System calculates: 45,000 ÷ 32 = 1,406.25 shares
   - Creates transaction:
     - Type: "investment"
     - Amount: ₹45,000
     - Receipt: AUTO-BAL-1710847234567
     - Shares: 1,406.25
   - Updates Company Account member:
     - Adds 1,406.25 to total shares
     - Records in activities
   - Updates balance: ₹45,000 → ₹0

6. **Verification**
   - Available Balance card now shows: ₹0
   - Investment Transactions table shows new entry
   - Company Account member profile shows:
     - Latest investment entry
     - Updated total shares

**Result:**
- Company balance fully invested
- Company owns 1,406.25 shares
- Shares tracked under Company Account
- Company participates in profit sharing
- Transaction recorded for audit

### Workflow 4: Dividend Distribution Event

**Actors:** Admin, Board of Directors
**Duration:** 1-2 hours

**Scenario:** Company decides to distribute ₹100,000 profit among eligible members

1. **Board Decision**
   - Board meeting held
   - Profit sharing approved: ₹100,000
   - Minimum holding period: 12 months
   - Event date: Mar 15, 2025

2. **Check Eligibility**
   - Admin navigates to "Dividend Donation" page
   - Sets configuration:
     - Event Date: March 15, 2025
     - Min Holding Period: 12 months
   - Clicks "Show Eligible Members"

3. **Review Results**
   - System shows:
     - Total Members: 50
     - Eligible: 35 members (joined before Mar 15, 2024, have shares)
     - Ineligible: 15 members (too recent or no shares)

4. **Eligible Members Table**
   - Lists all 35 qualified members with:
     - Member ID, Name, Phone, Email
     - Joining date, Months held, Total shares
   - Admin exports or notes down contact details

5. **Ineligible Members Table**
   - Lists 15 members with reasons:
     - "Only 8 months" - too early
     - "No shares" - didn't invest
     - "No joining date" - data issue
   - Admin reviews for data corrections

6. **External Distribution Process**
   - Admin calculates distribution amounts (outside system):
     - Total eligible shares: 8,500
     - Member A: 250 shares → (250/8,500) × 100,000 = ₹2,941
     - Member B: 180 shares → (180/8,500) × 100,000 = ₹2,118
     - ... (for all 35 members)

7. **Payment Processing**
   - Admin processes payments:
     - Bank transfers to member accounts
     - Or cash payments with receipts
     - Uses contact details from eligible list

8. **Record Keeping**
   - Admin creates external record of:
     - Who received how much
     - Payment dates and methods
     - Total amount distributed

**Note:** Current system only identifies eligible members. Actual distribution calculation and payment processing done externally.

**Result:**
- Eligible members identified correctly
- Contact details available for payment
- Ineligible members know why
- Distribution completed fairly
- Records maintained

### Workflow 5: Member Withdrawal Request

**Actors:** Admin, Member
**Duration:** 10-15 minutes

**Scenario:** Member needs ₹5,000 urgently, wants to withdraw

1. **Member Contact**
   - Member calls/visits office
   - Requests withdrawal
   - Admin checks member profile

2. **Navigate to Member**
   - Open Members directory
   - Search member's name/phone
   - Click to open detail page

3. **Review Member Status**
   - Check total shares: e.g., 250 shares
   - Check current share price: ₹35
   - Calculate max available: 250 × 35 = ₹8,750
   - Member wants: ₹5,000 (within limit ✓)

4. **Process Withdrawal**
   
   **A. Open Activity Page**
   - Find current month in list
   - Click "Activity" button
   - Select "Withdrawal" radio button

   **B. Review Information**
   - Present share price: ₹35 (auto-shown)
   - Total shares: 250 (auto-shown)
   - Total value: ₹8,750 (auto-shown)

   **C. Enter Withdrawal Amount**
   - Amount: ₹5,000
   - System calculates:
     - Shares to withdraw: 5000 ÷ 35 = 142.86
     - Remaining shares: 250 - 142.86 = 107.14
     - Remaining value: 107.14 × 35 = ₹3,750

   **D. Approve**
   - Click "Approve" button
   - System shows confirmation screen:
     - Amount available after: ₹3,750
     - Remaining shares: 107.14
   - Admin verifies with member
   - Member confirms

   **E. Confirm Withdrawal**
   - Click "Confirm" button
   - System processes:
     - Records withdrawal in activities
     - Deducts 142.86 shares from total
     - Updates member's total_shares to 107.14

5. **Payment**
   - Admin pays member ₹5,000 (cash/transfer)
   - Member signs receipt
   - Withdrawal complete

6. **Verification**
   - Member detail page refreshes
   - Current month shows: "Withdrawn: ₹5,000" in red
   - Overview card shows: Total Shares: 107.14
   - Member can still invest in future

**Result:**
- Member receives ₹5,000
- Shares reduced accordingly
- Transaction recorded
- Member remains active
- Can continue investing

### Workflow 6: Membership Refund Settlement

**Actors:** Admin, Member
**Duration:** 5 minutes

**Scenario:** Member joined Jan 10, 2020. Today is Jan 15, 2025 (5+ years)

1. **Member Request**
   - Member contacts admin
   - Requests membership fee refund
   - Admin checks eligibility

2. **Navigate to Refund Page**
   - From dashboard, click "Membership Refund" tile
   - System auto-categorizes all members

3. **Locate Member**
   - Member appears in "Eligible for Refund" table (green)
   - Shows:
     - Name, Phone: Member details
     - Membership ID: 2020-005
     - Joining Date: Jan 10, 2020
     - Years Since Joining: 5.0 years

4. **Settle Refund**
   - Click green "Settle" button next to member
   - Confirmation dialog appears:
     "Settle refund of ₹10,000 for [Member Name]? Member has completed 5.0 years and is eligible for refund."
   - Admin verifies with member
   - Clicks "OK"

5. **System Processing**
   - Updates member record:
     - membershipRefunded: true
     - refundDate: Jan 15, 2025
     - refundAmount: 10000
     - settledEarly: false (after 5 years)
   - Creates transaction:
     - Type: "membership_refund"
     - Amount: -₹10,000 (deducted from company)
     - Receipt: REFUND-1710847234567
     - Description: "Membership refund settled for [Name] - 5.0 years after joining"
   - Deducts from company balance

6. **Payment**
   - Admin pays member ₹10,000
   - Member signs settlement receipt
   - Admin files documentation

7. **Verification**
   - Member moves to "Settled Members" table (blue)
   - Shows settled date and amount
   - "Settled" button displayed (disabled, blue)
   - Cannot be settled again
   - Company balance reduced by ₹10,000

**Result:**
- Member receives ₹10,000 refund
- Keeps all shares (not affected)
- Can continue investing
- Settlement recorded permanently
- Company balance adjusted

### Workflow 7: End-of-Year Reporting

**Actors:** Admin, Accountant, Board Members
**Duration:** 2-3 hours

**Scenario:** Year-end 2024, need comprehensive reports for annual meeting

**December 31, 2024 - Report Preparation Day**

1. **Complete System Backup**
   - Navigate to Reports page
   - Select: "Complete System Report"
   - Year: 2024
   - Click "Generate & Download Report"
   - Download: `all_details_report_2024.xlsx`
   - Contains:
     - All members
     - All transactions
     - All share prices
   - Store in archive folder

2. **Company Valuation Report**
   - Select: "Company Valuation Report"
   - Year: 2024
   - Month: Dec
   - Generate & Download
   - Shows:
     - Total members: 50
     - Total shares: 12,500.75
     - Total investment: ₹365,000
     - Current share price: ₹30
     - Company valuation: ₹375,022.50

3. **Share Distribution Report**
   - Select: "Share Distribution Report"
   - Year: 2024
   - Month: Dec
   - Generate & Download
   - Shows each member's:
     - Total shares
     - Ownership percentage
     - Investment status

4. **Directors Valuation Report**
   - Select: "Directors Report"
   - Year: 2024
   - Month: Dec
   - Generate & Download
   - Shows all price approvals in 2024

5. **Monthly Shares Analysis**
   - Select: "New Shares Monthwise Report"
   - Year: 2024
   - Generate & Download
   - Shows month-by-month growth:
     - Jan: 125 shares
     - Feb: 145 shares
     - Mar: 156 shares
     - ... (all 12 months)
   - Shows growth trends

6. **Dividend Report (if applicable)**
   - Select: "Dividend Report"
   - Year: 2024
   - Month: Dec
   - Generate & Download
   - Lists all eligible members for year-end dividend

7. **Company Funds Analysis**
   - Select: "Company Funds Report"
   - Start Date: Jan 1, 2024
   - End Date: Dec 31, 2024
   - Generate & Download
   - Shows:
     - Total pooled: ₹150,000
     - Total transactions: 165
     - Average: ₹909.09

8. **Audit Reports**
   - Generate Monthly Funding Audit for all 12 months
   - Month by month: Jan 2024 → Dec 2024
   - Stack with physical receipts
   - Prepare for auditor

9. **Annual Meeting Package**
   - Compile all reports into folder:
     ```
     2024_Annual_Reports/
       ├── company_valuation_report_2024_Dec.xlsx
       ├── share_distribution_report_2024_Dec.xlsx
       ├── directors_report_2024_Dec.xlsx
       ├── new_shares_monthwise_2024.xlsx
       ├── dividend_report_2024_Dec.xlsx
       ├── company_pooled_amount_2024.xlsx
       ├── all_details_report_2024.xlsx
       └── monthly_audits/
           ├── monthly_funding_audit_2024_Jan.xlsx
           ├── monthly_funding_audit_2024_Feb.xlsx
           └── ... (all 12 months)
     ```

10. **Presentation Preparation**
    - Open valuation report in Excel
    - Create charts:
      - Company growth chart
      - Share distribution pie chart
      - Monthly investment bar chart
    - Prepare PowerPoint with highlights

11. **Board Meeting**
    - Present reports to board
    - Discuss growth: ₹365,000 investment, 50 members
    - Review valuation: ₹375,022.50
    - Show ownership distribution
    - Approve share price for next quarter

**Result:**
- Complete year documented
- All reports archived
- Board meeting successful
- Data ready for auditor
- Planning for next year

---

## Key System Features

### Real-Time Updates
- All data updates automatically across pages
- No manual refresh needed
- Multiple admins can work simultaneously
- Changes instantly visible to all users

### Data Integrity
- Phone number = unique member identifier
- One investment per member per month
- Share prices must be set before investments
- Total shares auto-calculated and synced
- Audit trail for all transactions

### User Roles & Permissions
- **Admin:** Full access to everything
- **Employees:** Limited access based on assigned permissions
- Granular control over each feature
- Easy permission management via dashboard

### Audit & Compliance
- Every transaction recorded with timestamp
- Receipt numbers for all investments
- Complete financial trail
- Refund tracking
- Historical share price preservation
- Excel reports for external audits

### Scalability
- Handles unlimited members
- Unlimited transactions
- Multi-year data
- Growing report library
- Cloud-based (Supabase)

### User Experience
- Clean, modern interface
- Color-coded sections
- Intuitive navigation
- Clear visual indicators
- Helpful error messages
- Search and filter capabilities

---

## System Benefits

### For Administrators
- **Centralized Management:** All data in one place
- **Automated Calculations:** Shares, balances, eligibility auto-computed
- **Quick Access:** Find any member/transaction instantly
- **Comprehensive Reports:** 9 report types for all needs
- **Error Prevention:** Validations prevent duplicate/invalid entries
- **Audit Ready:** Complete trail for compliance

### For Members
- **Transparent:** Can see all their transactions
- **Fair Distribution:** Automated eligibility checks
- **Secure:** Data protected with authentication
- **Flexible:** Can invest, withdraw, get refunds
- **Long-term:** Refundable membership fee

### For Business
- **Growth Tracking:** Monthly/yearly analytics
- **Financial Management:** Company balance tracked separately
- **Scalable:** Grows with member base
- **Professional:** Excel reports for stakeholders
- **Compliant:** Audit trails and documentation

---

## Important Business Rules

1. **Membership Fee:** ₹10,000 (refundable - eligible after 5 years, can settle anytime)
2. **Monthly Investment:** Typically ₹2,000 (flexible)
3. **Share Allocation:** Investment ÷ Current Share Price
4. **One Investment/Month:** Cannot duplicate
5. **Monthly Pricing:** Share price set independently for each month
6. **Fine After 15th:** Late payments incur fines
7. **Holding Period:** 12 months for dividend eligibility
8. **Withdrawal Anytime:** Based on current share price
9. **Company Investment:** All company balance invested monthly
10. **Refund Settlement:** Automatic eligibility after 5 years, manual settlement option before 5 years

---

## Conclusion

The K-G Investment Management System is a comprehensive, user-friendly platform that manages all aspects of an investment cooperative. From member onboarding to dividend distribution, from share price management to financial reporting, every feature is designed to ensure accuracy, transparency, and efficiency.

The system successfully balances ease of use with powerful functionality, making it ideal for cooperative investment management. With real-time updates, robust reporting, and clear audit trails, it provides a professional solution for managing member investments and company finances.

---

*Document Version: 1.0*
*Last Updated: February 2025*
*System: K-G Investment Management System*
