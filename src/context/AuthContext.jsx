import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Define user roles and their permissions - moved outside component to prevent re-creation
export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

// Define available tiles and their permissions - moved outside component to prevent re-creation
export const TILE_PERMISSIONS = {
  COMPANY_ACCOUNT: 'company_account',
  MEMBERS: 'members',
  DIVIDEND_DONATION: 'dividend_donation',
  ADD_MEMBER: 'add_member',
  COMPANY_AMOUNT: 'company_amount',
  SHARE_PRICE: 'share_price',
  DOWNLOAD_REPORT: 'download_report',
  MEMBERSHIP_REFUND: 'membership_refund',
  REMINDERS: 'reminders',
  EMPLOYEE_ACCESS: 'employee_access' // Admin only
};

// Employee credentials mapping - moved outside component to prevent re-creation
export const EMPLOYEE_CREDENTIALS = {
  'employee1@gmail.com': 'Employee1@12',
  'employee2@gmail.com': 'Employee2@12'
};

// Shared Supabase session for employees (you'll need to create this user in Supabase)
const EMPLOYEE_SUPABASE_CREDENTIALS = {
  email: 'employees@yourcompany.com', // Create this user in Supabase
  password: 'EmployeeAccess2024!' // Set this password in Supabase
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [employeePermissions, setEmployeePermissions] = useState({});
  const [employeeReportAccess, setEmployeeReportAccess] = useState({});
  const [loading, setLoading] = useState(true);

  // Function to determine user role based on email
  const getUserRole = (email) => {
    if (EMPLOYEE_CREDENTIALS[email]) {
      return USER_ROLES.EMPLOYEE;
    }
    return USER_ROLES.ADMIN;
  };

  // Function to check employee session
  const checkEmployeeSession = () => {
    const employeeSession = localStorage.getItem('employeeSession');
    if (employeeSession) {
      try {
        const session = JSON.parse(employeeSession);
        if (session.expires_at > Date.now()) {
          return session.user;
        } else {
          localStorage.removeItem('employeeSession');
        }
      } catch (e) {
        localStorage.removeItem('employeeSession');
      }
    }
    return null;
  };

  // Function to load employee permissions from localStorage
  const loadEmployeePermissions = () => {
    const saved = localStorage.getItem('employeePermissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing employee permissions:', e);
        return {};
      }
    }
    return {};
  };

  // Function to save employee permissions to localStorage
  const saveEmployeePermissions = (permissions) => {
    localStorage.setItem('employeePermissions', JSON.stringify(permissions));
    setEmployeePermissions(permissions);
  };

  // Function to update employee permissions
  const updateEmployeePermission = (employeeEmail, tileKey, hasAccess) => {
    const current = loadEmployeePermissions();
    if (!current[employeeEmail]) {
      current[employeeEmail] = {};
    }
    current[employeeEmail][tileKey] = hasAccess;
    saveEmployeePermissions(current);
  };

  // Function to load employee report access from localStorage
  const loadEmployeeReportAccess = () => {
    const saved = localStorage.getItem('employeeReportAccess');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing employee report access:', e);
        return {};
      }
    }
    return {};
  };

  // Function to save employee report access to localStorage
  const saveEmployeeReportAccess = (reportAccess) => {
    localStorage.setItem('employeeReportAccess', JSON.stringify(reportAccess));
    setEmployeeReportAccess(reportAccess);
  };

  // Function to update employee report access
  const updateEmployeeReportAccess = (reportKey, hasAccess) => {
    const current = loadEmployeeReportAccess();
    current[reportKey] = hasAccess;
    saveEmployeeReportAccess(current);
  };

  // Function to check if user has access to a specific report
  const hasReportAccess = (reportKey) => {
    if (userRole === USER_ROLES.ADMIN) {
      return true; // Admin has access to all reports
    }
    
    if (userRole === USER_ROLES.EMPLOYEE) {
      const reportAccess = loadEmployeeReportAccess();
      return reportAccess[reportKey] === true;
    }
    
    return false;
  };

  // Function to check if user has access to a specific tile
  const hasTileAccess = (tileKey) => {
    if (userRole === USER_ROLES.ADMIN) {
      return true; // Admin has access to all tiles
    }
    
    if (userRole === USER_ROLES.EMPLOYEE && currentUser?.email) {
      const employeePerms = loadEmployeePermissions();
      return employeePerms[currentUser.email]?.[tileKey] === true;
    }
    
    return false;
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      // Check for employee session first
      const employeeUser = checkEmployeeSession();
      if (employeeUser) {
        setCurrentUser(employeeUser);
        setUserRole(USER_ROLES.EMPLOYEE);
      } else {
        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        setCurrentUser(user);
        
        if (user?.email) {
          const role = getUserRole(user.email);
          setUserRole(role);
        }
      }
      
      // Load employee permissions
      setEmployeePermissions(loadEmployeePermissions());
      // Load employee report access
      setEmployeeReportAccess(loadEmployeeReportAccess());
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Check for employee session first
        const employeeUser = checkEmployeeSession();
        if (employeeUser) {
          setCurrentUser(employeeUser);
          setUserRole(USER_ROLES.EMPLOYEE);
        } else {
          const user = session?.user ?? null;
          setCurrentUser(user);
          
          if (user?.email) {
            const role = getUserRole(user.email);
            setUserRole(role);
          } else {
            setUserRole(null);
          }
        }
        
        // Load employee permissions
        setEmployeePermissions(loadEmployeePermissions());
        // Load employee report access
        setEmployeeReportAccess(loadEmployeeReportAccess());
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      // Clear employee session if exists
      localStorage.removeItem('employeeSession');
      
      // Sign out from Supabase if admin
      if (userRole === USER_ROLES.ADMIN) {
        await supabase.auth.signOut();
      }
      
      setCurrentUser(null);
      setUserRole(null);
      setEmployeePermissions({});
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    currentUser,
    userRole,
    employeePermissions,
    employeeReportAccess,
    logout,
    loading,
    hasTileAccess,
    updateEmployeePermission,
    hasReportAccess,
    updateEmployeeReportAccess,
    loadEmployeeReportAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 