export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing or using Life Designer ("the Service"), you agree to be bound by these Terms of Service
          ("Terms"). If you do not agree to these Terms, please do not use the Service.
        </p>
        <p className="mb-4">
          We reserve the right to modify these Terms at any time. We will notify you of any changes by posting
          the new Terms on this page. Your continued use of the Service after such modifications constitutes
          your acceptance of the new Terms.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
        <p className="mb-3">Life Designer is a personal productivity and goal management application that provides:</p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Goal tracking and management</li>
          <li>Calendar integration with Google Calendar</li>
          <li>Time tracking and analytics</li>
          <li>Notes and reflections</li>
          <li>Personal productivity insights</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
        <p className="mb-4">
          To use the Service, you must create an account by signing in with your Google account. You agree to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Provide accurate and complete information when creating your account</li>
          <li>Maintain the security of your account credentials</li>
          <li>Accept responsibility for all activities that occur under your account</li>
          <li>Notify us immediately of any unauthorized access or security breach</li>
        </ul>
        <p className="mb-4">
          You are solely responsible for maintaining the confidentiality of your Google account credentials.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">4. Google Calendar Integration</h2>
        <p className="mb-4">
          The Service integrates with Google Calendar. By granting calendar access, you authorize us to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Read your calendar events to display them within the application</li>
          <li>Create, modify, and delete calendar events on your behalf when you use calendar features</li>
          <li>Access calendar metadata necessary for the Service to function</li>
        </ul>
        <p className="mb-4">
          You can revoke calendar access at any time through your Google Account settings. Revoking access will
          disable calendar-related features but will not affect other parts of the Service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
        <p className="mb-3">You agree NOT to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Violate any laws in your jurisdiction (including copyright laws)</li>
          <li>Transmit any viruses, malware, or malicious code</li>
          <li>Attempt to gain unauthorized access to the Service or related systems</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Collect or harvest any personally identifiable information from the Service</li>
          <li>Use the Service to send spam or unsolicited messages</li>
          <li>Impersonate any person or entity</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
        <p className="mb-4">
          The Service and its original content, features, and functionality are owned by Life Designer and are
          protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </p>
        <p className="mb-4">
          You retain all rights to the content you create within the Service (goals, notes, reflections, etc.).
          By using the Service, you grant us a license to store, display, and process your content solely for
          the purpose of providing the Service to you.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
        <p className="mb-4">
          We strive to provide reliable and uninterrupted service, but we cannot guarantee that the Service will
          be available at all times. The Service may be temporarily unavailable due to:
        </p>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Scheduled maintenance</li>
          <li>Technical issues or outages</li>
          <li>Third-party service disruptions (Google, Supabase, Vercel)</li>
          <li>Force majeure events</li>
        </ul>
        <p className="mb-4">
          We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">8. Data and Privacy</h2>
        <p className="mb-4">
          Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to
          the collection and use of information as described in our Privacy Policy.
        </p>
        <p className="mb-4">
          We implement reasonable security measures to protect your data, but we cannot guarantee absolute security.
          You acknowledge that you use the Service at your own risk.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
        <p className="mb-4">
          To the maximum extent permitted by law, Life Designer shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly
          or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Your use or inability to use the Service</li>
          <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
          <li>Any interruption or cessation of transmission to or from the Service</li>
          <li>Any bugs, viruses, or malicious code that may be transmitted through the Service</li>
          <li>Any errors or omissions in any content or for any loss or damage incurred as a result of your use of any content</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
        <p className="mb-4">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
        <p className="mb-4">
          We reserve the right to terminate or suspend your account and access to the Service immediately, without prior
          notice or liability, for any reason, including but not limited to breach of these Terms.
        </p>
        <p className="mb-4">
          You may terminate your account at any time by contacting us or using the account deletion feature in the Service.
          Upon termination, your data will be deleted in accordance with our Privacy Policy.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
        <p className="mb-4">
          These Terms shall be governed by and construed in accordance with applicable international laws, without regard
          to conflict of law provisions.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
        <p className="mb-4">
          We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide
          at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be
          determined at our sole discretion.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
        <p className="mb-2">If you have any questions about these Terms of Service, please contact us:</p>
        <p className="mb-4">
          <strong>Email:</strong> <a href="mailto:ukrainianmartyn@gmail.com" className="text-primary hover:underline">ukrainianmartyn@gmail.com</a>
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          By using Life Designer, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </p>
      </section>
    </div>
  );
}
