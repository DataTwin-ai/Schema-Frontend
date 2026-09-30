'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { Layers, Lightbulb, ArrowRight, AlertCircle, Loader2, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useWorkflow();

  const [email, setEmail] = useState('admin@datatwin.ai');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const res = await login(email, password);
    if (!res.success) {
      setErrorMessage(res.error || 'Invalid credentials');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-150">
      {/* Top minimal header with brand & theme toggle */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-tight text-neutral-900 dark:text-neutral-100 text-sm">
              DataTwin
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
              Enterprise
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors shadow-xs"
          aria-label="Toggle theme"
        >
          <Lightbulb className={`h-4 w-4 transition-transform ${theme === 'dark' ? 'text-neutral-500' : 'text-amber-500 fill-amber-500/20'}`} />
        </button>
      </header>

      {/* Main Centered Login Box */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7 lg:p-8 shadow-sm space-y-6 transition-colors animate-in fade-in zoom-in-95 duration-200">
          {/* Header Title */}
          <div className="space-y-1.5 text-center">
            <div className="inline-flex h-10 w-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 items-center justify-center shadow-sm mb-2">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              Welcome to DataTwin
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Sign in to continue to your Schema Generator workspace
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700 dark:text-neutral-300 block">
                Work Email
              </label>
              <div className="relative rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 overflow-hidden focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-transparent pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Demo environment: Any email and password >= 4 characters is accepted.')}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 overflow-hidden focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full bg-transparent pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50 font-bold rounded-lg text-xs transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Account Indicator */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <p className="text-[11px] text-neutral-400">
              Demo Credentials: <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">admin@datatwin.ai</span> / <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
