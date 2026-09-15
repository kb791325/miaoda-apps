import React from 'react';
import {
  Search,
  BarChart3,
  FileText,
  Video,
  FolderKanban,
  Library,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { path: '/', label: '爆款搜索台', icon: <Search size={18} /> },
  { path: '/analyze', label: '拆解中心', icon: <BarChart3 size={18} /> },
  { path: '/script', label: '脚本工坊', icon: <FileText size={18} /> },
  { path: '/produce', label: '视频制作', icon: <Video size={18} /> },
  { path: '/project', label: '项目库', icon: <FolderKanban size={18} /> },
  { path: '/gene', label: '基因库', icon: <Library size={18} /> },
];

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: '#0a0e27' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: 240,
          backgroundColor: '#0a0e27',
          borderRight: '1px solid #1e293b',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center h-16 border-b"
          style={{ borderColor: 'rgba(148,163,184,0.1)' }}
        >
          <h1
            className="text-lg font-semibold tracking-wide"
            style={{
              color: '#e2e8f0',
              textShadow: '0 0 20px rgba(99,102,241,0.6)',
            }}
          >
            <span style={{ color: '#6366f1' }}>爆款</span>视频AI工坊
          </h1>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
                  isActive
                    ? 'text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'rgba(99,102,241,0.15)',
                      borderLeft: '3px solid #00d4ff',
                      paddingLeft: 13,
                    }
                  : {}
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-3 text-xs text-slate-500 border-t text-center"
          style={{ borderColor: 'rgba(148,163,184,0.1)' }}
        >
          v1.0.0 · 智能创作平台
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
