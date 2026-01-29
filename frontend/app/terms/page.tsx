export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: January 29, 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-300 leading-relaxed">
            By accessing or using TaskFlow AI ("the Service"), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-gray-300 leading-relaxed">
            TaskFlow AI is a productivity application that helps users manage tasks through
            AI-powered task breakdown, smart scheduling, and calendar integration. The Service
            includes features such as:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
            <li>AI-powered task decomposition into actionable subtasks</li>
            <li>Focus mode with Pomodoro-style timers</li>
            <li>Google Calendar integration for smart scheduling</li>
            <li>Cross-device synchronization</li>
            <li>Push notifications and reminders</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
          <p className="text-gray-300 leading-relaxed">
            To use certain features of the Service, you must create an account. You are responsible
            for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. User Content</h2>
          <p className="text-gray-300 leading-relaxed">
            You retain ownership of all content you create within the Service, including tasks,
            notes, and other data. By using the Service, you grant us a limited license to store,
            process, and display your content solely for the purpose of providing the Service to you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Third-Party Integrations</h2>
          <p className="text-gray-300 leading-relaxed">
            The Service may integrate with third-party services such as Google Calendar.
            Your use of these integrations is subject to the respective third party's terms
            of service and privacy policies. We are not responsible for the practices of
            third-party services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Prohibited Uses</h2>
          <p className="text-gray-300 leading-relaxed">You agree not to:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Reverse engineer or attempt to extract the source code</li>
            <li>Use automated systems to access the Service without permission</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
          <p className="text-gray-300 leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
            IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
            COMPLETELY SECURE.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-300 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED
            TO YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
          <p className="text-gray-300 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify users of
            significant changes by posting a notice on the Service. Your continued use of the
            Service after such changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
          <p className="text-gray-300 leading-relaxed">
            We may terminate or suspend your access to the Service at any time, with or without
            cause, with or without notice. Upon termination, your right to use the Service will
            immediately cease.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">11. Contact Information</h2>
          <p className="text-gray-300 leading-relaxed">
            For any questions regarding these Terms of Service, please contact us at:
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
