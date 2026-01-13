export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>

        <h3 className="text-xl font-semibold mb-2 mt-4">1.1 Google Account Information</h3>
        <p className="mb-3">When you sign in with Google OAuth, we collect:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Email address</li>
          <li>Name and profile picture</li>
          <li>Google account ID</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2 mt-4">1.2 Google Calendar Data</h3>
        <p className="mb-3">With your explicit permission, we access:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Calendar events (titles, descriptions, dates, times)</li>
          <li>Event attendees and locations</li>
          <li>Calendar metadata</li>
        </ul>
        <p className="mb-4">We only access your calendar data when you explicitly grant permission and use calendar features.</p>

        <h3 className="text-xl font-semibold mb-2 mt-4">1.3 Usage Data</h3>
        <p className="mb-3">We collect information about how you use our service:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Goals you create and manage</li>
          <li>Time tracking entries</li>
          <li>Notes and reflections you add</li>
          <li>App interactions and preferences</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
        <p className="mb-3">We use the collected information to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><strong>Provide Services:</strong> Enable core functionality including goal tracking, calendar integration, and time management</li>
          <li><strong>Sync Calendar:</strong> Display and manage your calendar events within the application</li>
          <li><strong>Personalization:</strong> Customize your experience based on your preferences and goals</li>
          <li><strong>Analytics:</strong> Improve our service and understand usage patterns</li>
          <li><strong>Communication:</strong> Send important updates about your account or service changes</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
        <p className="mb-3">Your data is stored securely:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><strong>Database:</strong> Supabase (PostgreSQL) with encryption at rest</li>
          <li><strong>Hosting:</strong> Vercel infrastructure with industry-standard security</li>
          <li><strong>Access Control:</strong> Row Level Security (RLS) ensures you only access your own data</li>
          <li><strong>Authentication:</strong> Secure OAuth 2.0 flow via NextAuth.js</li>
        </ul>
        <p className="mb-4">We do NOT permanently store your Google Calendar events. Calendar data is fetched in real-time when you use calendar features and is not retained on our servers.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
        <p className="mb-3">We use the following third-party services:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><strong>Google:</strong> Authentication and Calendar API access</li>
          <li><strong>Supabase:</strong> Database and backend services</li>
          <li><strong>Vercel:</strong> Hosting and deployment</li>
        </ul>
        <p className="mb-4">Each service has its own privacy policy. We recommend reviewing them:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Google Privacy Policy: <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
          <li>Supabase Privacy Policy: <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a></li>
          <li>Vercel Privacy Policy: <a href="https://vercel.com/legal/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://vercel.com/legal/privacy-policy</a></li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">5. Your Rights and Control</h2>
        <p className="mb-3">You have the right to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Update or correct your information</li>
          <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
          <li><strong>Revoke Access:</strong> Remove Google Calendar access at any time via Google account settings</li>
          <li><strong>Export:</strong> Download your goals, notes, and time tracking data</li>
        </ul>
        <p className="mb-4">To revoke Google Calendar access:</p>
        <ol className="list-decimal pl-6 space-y-1 mb-4">
          <li>Visit <a href="https://myaccount.google.com/permissions" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a></li>
          <li>Find "Life Designer" in the list</li>
          <li>Click "Remove Access"</li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
        <p className="mb-4">
          We retain your personal data as long as your account is active. If you delete your account,
          we will delete all your personal data within 30 days, except where we are required to retain
          certain information for legal or regulatory purposes.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">7. Cookies and Sessions</h2>
        <p className="mb-4">
          We use session cookies via NextAuth.js to maintain your logged-in state. These cookies are
          essential for the service to function and are deleted when you log out or after a period of inactivity.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
        <p className="mb-4">
          Our service is not intended for children under 13 years of age. We do not knowingly collect
          personal information from children under 13.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
        <p className="mb-4">
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new Privacy Policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
        <p className="mb-2">If you have questions about this Privacy Policy, please contact us:</p>
        <p className="mb-4">
          <strong>Email:</strong> <a href="mailto:ukrainianmartyn@gmail.com" className="text-primary hover:underline">ukrainianmartyn@gmail.com</a>
        </p>
      </section>
    </div>
  );
}
