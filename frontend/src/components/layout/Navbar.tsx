import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/LoadingSpinner';
import { RoleBadge } from '../ui/Badge';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div>
        {title && <h1 className="text-lg font-semibold text-slate-900">{title}</h1>}
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <RoleBadge role={user.role} />
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} avatar={user.avatar} size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-900 leading-none">{user.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
