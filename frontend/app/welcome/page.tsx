import Link from 'next/link';

// This is a Server Component - renders without JavaScript
export default function WelcomePage() {
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

        {/* CTA Button */}
        <div className="mb-8">
          <Link
            href="/"
            className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors inline-block"
          >
            Get Started with TaskFlow AI
          </Link>
        </div>

        {/* App Description */}
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
