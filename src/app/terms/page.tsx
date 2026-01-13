export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-3">Acceptance of Terms</h2>
        <p>By accessing our service, you agree to these terms.</p>
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-3">Use of Service</h2>
        <p>
          You agree to use the service in accordance with all applicable laws.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-3">Contact</h2>
        <p>Email: ukrainianmartyn@gmail.com</p>
      </section>
    </div>
  );
}
