import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Login from '../pages/Login';
import Admin from '../pages/Admin';
import MemberDetail from '../pages/MemberDetail';
import Insurance from '../pages/addMember/Insurance';
import Payment from '../pages/addMember/Payment';
import Compamt from '../pages/Compamt';
import Pd from '../pages/addMember/Pd';
import MonthlyActivity from '../pages/MonthlyActivity';
import SharePrice from '../pages/SharePrice';
import Members from '../pages/Members';
import MembershipRefund from '../pages/MembershipRefund';
import Reports from '../pages/Reports';
import Dividend from '../pages/Dividend';
// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function Routers() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dividend" 
        element={
          <ProtectedRoute>
            <Dividend />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/:id"
        element={
          <ProtectedRoute>
            <MemberDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/:id/activity/:year/:month"
        element={
          <ProtectedRoute>
            <MonthlyActivity />
          </ProtectedRoute>
        }
      />
  
      <Route
        path="/insurance"
        element={
          <ProtectedRoute>
            <Insurance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />
 <Route
        path="/company-amount"
        element={
          <ProtectedRoute>
            <Compamt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personal"
        element={
          <ProtectedRoute>
            <Pd />
          </ProtectedRoute>
        }
      />
     
      <Route
        path="/share-price"
        element={
          <ProtectedRoute>
            <SharePrice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/membership-refund"
        element={
          <ProtectedRoute>
            <MembershipRefund />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default Routers;