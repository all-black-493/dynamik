export default function PrivacyPolicyPage() {
    return (
        <main className="px-8 py-16 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

            <p className="mb-4">
                This privacy policy explains how we collect, use, disclose, and safeguard your
                personal information when you use our website and services.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">Information We Collect</h2>
            <p className="mb-4">
                We may collect various types of personal information, such as your name, email
                address, and other identifiers when you submit forms or interact with our site.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">How We Use Your Information</h2>
            <p className="mb-4">
                We use the information we collect to provide, maintain, and improve our services,
                communicate with you, and personalize your experience.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">Third-Party Services</h2>
            <p className="mb-4">
                Our site may use third-party services (like analytics providers) that may collect
                information about your use of the website. You should review their respective
                privacy policies to understand how they handle data.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">Cookies and Tracking</h2>
            <p className="mb-4">
                We may use cookies or similar tracking technologies to collect data about
                interactions with our website and services. You can usually control cookies
                through your browser settings.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">Your Rights</h2>
            <p className="mb-4">
                Depending on where you live, you may have rights regarding your personal data,
                such as accessing, updating, or deleting information we hold about you.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">Changes to This Policy</h2>
            <p className="mb-4">
                We may update this privacy policy occasionally. We will post the updated date
                and policy here when changes are made.
            </p>

            <p className="mt-8 text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
            </p>
        </main>
    )
}