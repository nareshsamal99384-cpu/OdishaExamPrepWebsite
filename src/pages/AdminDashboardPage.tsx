import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import AdminPanel from '../AdminPanel';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('oep_adminActiveTab');
      await logout();
      navigate('/admin-login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminPanel 
        onClose={() => navigate('/')} 
        onLogout={handleLogout}
      />
    </div>
  );
};

export default AdminDashboardPage;
