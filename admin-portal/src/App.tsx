import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Expenses from './pages/Expenses';
import AdsPage from './pages/AdsPage';
import SettingsPage from './pages/SettingsPage';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Security from './pages/Security';
import OCRManagement from './pages/OCRManagement';
import UserInsights from './pages/UserInsights';
import Sidebar from './components/Sidebar';

function PrivateRoute() {
  const token = localStorage.getItem('admin_token');
  return token ? <div className="flex h-screen bg-gray-100"><Sidebar /><div className="flex-1 overflow-auto p-8"><Outlet /></div></div> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/security" element={<Security />} />
          <Route path="/ocr" element={<OCRManagement />} />
          <Route path="/insights" element={<UserInsights />} />
          <Route path="/ads" element={<AdsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
