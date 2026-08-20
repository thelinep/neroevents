import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { toggleSidebar } from '../store/slices/uiSlice';
import { RootState, AppDispatch } from '../store';
import { Home, Clock, Settings, User, LogOut, Menu, Bot, MessageSquare, Cpu, Activity, Bug } from 'lucide-react';
import { Button } from '@nevo/ui';


const NavLink = ({
  to,
  icon,
  label
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => {
  const location = useLocation();
  const active =
    location.pathname === to ||
    location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        active
          ? 'bg-blue-500/20 text-blue-400'
          : 'hover:bg-[#1e293b]'
      }`}
    >
      {icon} {label}
    </Link>
  );
};

export default function Layout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { user } = useSelector(
    (state: RootState) => state.auth
  );

  const { sidebarOpen } = useSelector(
    (state: RootState) => state.ui
  );

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#080c16] text-white">

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-[#0f172a] border-r border-[#1e293b] p-4 flex flex-col transition-all duration-300`}
      >
        <div className="flex items-center justify-between mb-8">
          {sidebarOpen && (
            <span className="text-2xl font-bold text-blue-400">
              🚀 Builder
            </span>
          )}

 <Button
  type="button"
  variant="ghost"
  aria-label="Toggle sidebar"
  onClick={() => dispatch(toggleSidebar())}
>
  <Menu size={20} />
</Button>
        </div>

        <nav className="flex-1 space-y-2">
          <NavLink
            to="/dashboard"
            icon={<Home size={20} />}
            label={sidebarOpen ? 'Dashboard' : ''}
          />

          <NavLink
            to="/agents"
            icon={<Bot size={20} />}
            label={sidebarOpen ? 'Agents' : ''}
          />

          <NavLink
            to="/playground"
            icon={<MessageSquare size={20} />}
            label={sidebarOpen ? 'Playground' : ''}
          />

          <NavLink
            to="/model-studio"
            icon={<Cpu size={20} />}
            label={sidebarOpen ? 'Model Studio' : ''}
          />

          <NavLink
            to="/fine-tune"
            icon={<Activity size={20} />}
            label={sidebarOpen ? 'Fine-Tune' : ''}
          />

          <NavLink
            to="/quantum"
            icon={<Activity size={20} />}
            label={sidebarOpen ? 'Quantum' : ''}
          />

          <NavLink
            to="/debug"
            icon={<Bug size={20} />}
            label={sidebarOpen ? 'Debug' : ''}
          />

          <NavLink
            to="/history"
            icon={<Clock size={20} />}
            label={sidebarOpen ? 'History' : ''}
          />

          <NavLink
            to="/settings"
            icon={<Settings size={20} />}
            label={sidebarOpen ? 'Settings' : ''}
          />

          <NavLink
            to="/profile"
            icon={<User size={20} />}
            label={sidebarOpen ? 'Profile' : ''}
          />
        </nav>

        {sidebarOpen && (
          <div className="border-t border-[#1e293b] pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm">
                {user?.displayName?.[0] ||
                  user?.email?.[0] ||
                  'U'}
              </div>

              <span className="text-sm truncate">
                {user?.displayName || user?.email}
              </span>
            </div>

        <Button
  type="button"
  variant="ghost"
  onClick={() => void handleLogout()}
>
  <LogOut size={16} />
  Logout
</Button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        <header className="bg-[#0f172a] border-b border-[#1e293b] p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Welcome back, {user?.displayName || 'User'}
          </h1>

          <div className="flex items-center gap-4">
          <Button
  type="button"
  variant="ghost"
  aria-label="Notifications"
>
  🔔
</Button>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>

      </main>
    </div>
  );
}