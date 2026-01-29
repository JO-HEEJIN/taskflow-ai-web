export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: January 29, 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            TaskFlow AI ("we", "our", or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our task management application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
          <p className="text-gray-300 leading-relaxed mb-4">We collect information that you provide directly to us:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li>Account information (email address, name)</li>
            <li>Task data (task titles, descriptions, subtasks, notes)</li>
            <li>Calendar data (when you connect Google Calendar)</li>
            <li>Usage data (app interactions, preferences)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Google Calendar Integration</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            When you connect your Google Calendar, we access:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li>Your calendar events (to find available time slots)</li>
            <li>Free/busy information (to avoid scheduling conflicts)</li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            We only read your calendar data to provide smart scheduling features.
            We do not modify or delete your existing calendar events without your explicit action.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li>To provide and maintain our service</li>
            <li>To personalize your experience</li>
            <li>To provide AI-powered task breakdown and scheduling</li>
            <li>To sync your data across devices</li>
            <li>To send you notifications about your tasks</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Data Storage and Security</h2>
          <p className="text-gray-300 leading-relaxed">
            Your data is stored securely on Microsoft Azure cloud services.
            We implement appropriate technical and organizational measures to protect
            your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Data Sharing</h2>
          <p className="text-gray-300 leading-relaxed">
            We do not sell, trade, or rent your personal information to third parties.
            We may share your information only in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and safety</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
          <p className="text-gray-300 leading-relaxed">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data</li>
            <li>Disconnect third-party integrations (like Google Calendar)</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-indigo-400 mt-2">info@birth2death.com</p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <a href="/" className="text-indigo-400 hover:text-indigo-300">
            &larr; Back to TaskFlow AI
          </a>
        </div>
      </div>
    </div>
  );
}
