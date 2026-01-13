export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-3">Information We Collect</h2>
        <p>
          We collect your email address and profile information from Google
          OAuth.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-3">
          How We Use Your Information
        </h2>
        <p>We use your information to provide and improve our services.</p>
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-3">Contact</h2>
        <p>Email: your-email@example.com</p>
      </section>
    </div>
  );
}
