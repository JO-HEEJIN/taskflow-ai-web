'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        {/* Logo & App Name */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 text-transparent bg-clip-text mb-4">
            TaskFlow AI
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            AI-powered task management that breaks down complex tasks into actionable steps
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Task Breakdown</h3>
            <p className="text-gray-400 text-sm">
              Automatically decompose overwhelming tasks into manageable 2-10 minute subtasks
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-lg font-semibold text-white mb-2">Smart Scheduling</h3>
            <p className="text-gray-400 text-sm">
              Integrates with Google Calendar to find the perfect time slots for your tasks
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">Focus Mode</h3>
            <p className="text-gray-400 text-sm">
              Immersive galaxy-themed focus sessions with Pomodoro timers and progress tracking
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => signIn('google')}
            className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          <button
            onClick={() => {
              // Initialize guest mode and go to app
              window.location.reload();
            }}
            className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            Try as Guest
          </button>
        </div>

        {/* App Description for Google Verification */}
        <div className="max-w-3xl mx-auto text-gray-400 text-sm leading-relaxed mb-8">
          <p>
            <strong className="text-white">TaskFlow AI</strong> is a productivity application designed to help users
            overcome task overwhelm through intelligent task decomposition. Using advanced AI, TaskFlow AI breaks
            down complex tasks into small, actionable subtasks (2-10 minutes each), making it easier to start
            and complete your goals. Features include cross-device synchronization, Google Calendar integration
            for smart scheduling, immersive focus mode with ambient music, and gamification elements to keep
            you motivated.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 text-sm">
            © 2026 TaskFlow AI. Built for Microsoft Imagine Cup 2026.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-purple-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:info@birth2death.com" className="text-gray-400 hover:text-purple-400 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
