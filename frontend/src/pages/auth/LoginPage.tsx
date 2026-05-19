import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  const fillDemo = (email: string) => {
    setForm({ email, password: 'password123' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PM App</h1>
          <p className="text-slate-500 text-sm mt-1">Project Management Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              error={errors.password}
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full mt-2" loading={isLoading} size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Admin', email: 'admin@pmapp.com' },
              { label: 'Project Manager', email: 'pm@pmapp.com' },
              { label: 'Developer', email: 'dev1@pmapp.com' },
              { label: 'Viewer', email: 'viewer@pmapp.com' },
            ].map(({ label, email }) => (
              <button
                key={email}
                onClick={() => fillDemo(email)}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-xs border border-slate-200"
              >
                <span className="font-semibold block">{label}</span>
                <span className="text-slate-500">{email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">Password: password123</p>
        </div>
      </div>
    </div>
  );
};
