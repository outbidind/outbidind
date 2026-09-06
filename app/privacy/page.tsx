import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | OutbidInd",
  description:
    "Learn how OutbidInd collects, uses, protects, and manages your information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="OutbidInd Home"
          >
            <Image
              src="/logo.png"
              alt="OutbidInd"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />

            <span className="text-xl font-bold tracking-tight">
              <span className="text-slate-900">Outbid</span>
              <span className="text-[#d94d28]">Ind</span>
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#d94d28] hover:text-[#d94d28]"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="border-b border-slate-100 bg-slate-50/70">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
          <div className="mb-5 inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#d94d28]">
            Privacy &amp; Trust
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Privacy Policy
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            We respect your privacy and are committed to being transparent
            about how your information is collected, used, and protected on
            OutbidInd.
          </p>

          <p className="mt-5 text-sm font-medium text-slate-500">
            Last Updated: September 6, 2026
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="space-y-14">
          {/* 1 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              1. Information We Collect
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              When you use OutbidInd, we may collect information that is
              necessary to provide our services, maintain account security,
              process transactions, and operate the platform.
            </p>

            <h3 className="mt-7 text-lg font-semibold text-slate-900">
              Account Information
            </h3>

            <p className="mt-3 leading-7 text-slate-600">
              When you create or use an account, we may collect:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Name</li>
              <li>Email address</li>
              <li>Account information</li>
              <li>Authentication-related information</li>
            </ul>

            <h3 className="mt-7 text-lg font-semibold text-slate-900">
              Business Listing Information
            </h3>

            <p className="mt-3 leading-7 text-slate-600">
              When you submit a business listing, we may collect information
              such as:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Business name</li>
              <li>Business category</li>
              <li>Business description</li>
              <li>Business location or address</li>
              <li>Business contact information</li>
              <li>Business website or social media information, if provided</li>
              <li>Other information submitted through the business listing form</li>
            </ul>

            <h3 className="mt-7 text-lg font-semibold text-slate-900">
              Bidding Information
            </h3>

            <p className="mt-3 leading-7 text-slate-600">
              When you participate in bidding on OutbidInd, we may collect
              information related to:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Your account</li>
              <li>The listing you bid on</li>
              <li>Bid amount</li>
              <li>Bid activity</li>
              <li>Date and time of the bid</li>
              <li>Payment or order status related to the bid</li>
            </ul>

            <h3 className="mt-7 text-lg font-semibold text-slate-900">
              Technical Information
            </h3>

            <p className="mt-3 leading-7 text-slate-600">
              We may automatically receive certain technical information when
              you use our website, such as:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Operating system</li>
              <li>Website usage information</li>
              <li>Log and diagnostic information</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              2. How We Use Your Information
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              We may use the information we collect to:
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Create and manage your account</li>
              <li>Process and manage business listings</li>
              <li>Process bidding activity</li>
              <li>Process payments and payment-related transactions</li>
              <li>Verify transactions</li>
              <li>Prevent fraud, abuse, and unauthorized activity</li>
              <li>Maintain the security of our platform</li>
              <li>Send important account and transaction-related emails</li>
              <li>Provide customer support</li>
              <li>Improve the functionality and performance of OutbidInd</li>
              <li>Detect and investigate technical or security issues</li>
              <li>Comply with applicable laws and legal requirements</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              3. Business Listings and Public Information
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              When you submit a business listing to OutbidInd, certain
              information about the business may be displayed publicly on the
              platform.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              This may include:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Business name</li>
              <li>Business category</li>
              <li>Business description</li>
              <li>Business location</li>
              <li>Other business information intentionally submitted for public display</li>
            </ul>

            <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-5">
              <p className="font-semibold text-slate-900">
                Please do not submit sensitive personal information in a
                business listing unless it is necessary and appropriate to do
                so.
              </p>

              <p className="mt-2 leading-7 text-slate-600">
                Information that you intentionally provide for public display
                may be visible to other users of OutbidInd.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              4. Payments
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Payments on OutbidInd are processed through{" "}
              <strong className="text-slate-900">Razorpay</strong>, a
              third-party payment service provider.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              Razorpay may process payment information necessary to complete
              and verify transactions. OutbidInd does not intend to store your
              complete payment card details or banking credentials on its own
              servers.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              For payment processing, transaction verification, refunds where
              applicable, and related activities, we may receive limited
              transaction information such as:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Payment status</li>
              <li>Transaction or order information</li>
              <li>Razorpay payment reference or transaction ID</li>
              <li>Payment amount</li>
              <li>Date and time of transaction</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              Your payment information may be handled by Razorpay in
              accordance with Razorpay&apos;s own terms, privacy policy, and
              security practices.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              By making a payment through OutbidInd, you acknowledge that the
              payment transaction is processed through Razorpay and that
              Razorpay may process the information required to complete the
              transaction.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              5. Fraud Prevention and Security
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Security and fraud prevention are important parts of the
              OutbidInd platform.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              We may use technical systems and third-party security services
              to:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Detect suspicious activity</li>
              <li>Prevent fraudulent submissions</li>
              <li>Protect accounts and transactions</li>
              <li>Detect potentially malicious or unsafe activity</li>
              <li>Prevent abuse of our platform</li>
              <li>Maintain platform security</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              However, no internet-based service can guarantee absolute
              security. We continuously work to protect information from
              unauthorized access, misuse, alteration, or disclosure.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              6. Emails and Notifications
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              We may send emails related to your use of OutbidInd, including:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Account-related emails</li>
              <li>Business listing status updates</li>
              <li>Payment-related notifications</li>
              <li>Transaction-related notifications</li>
              <li>Important service or security notifications</li>
              <li>Other necessary communications related to your activity on the platform</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              Some service-related emails are necessary for operating the
              platform and may not be optional.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              7. Third-Party Service Providers
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              OutbidInd may use trusted third-party services to operate and
              improve the platform.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              These services may include providers for:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Authentication and database services</li>
              <li>Payment processing</li>
              <li>Email delivery</li>
              <li>Website hosting and deployment</li>
              <li>Background task processing</li>
              <li>Security and fraud prevention</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              Depending on the service being used, these providers may process
              information necessary to provide their services to OutbidInd.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              Third-party providers process information according to their own
              terms and privacy policies.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              8. Data Retention
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              We retain information for as long as reasonably necessary for
              the purposes described in this Privacy Policy, including:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Providing and maintaining our services</li>
              <li>Maintaining account and transaction records</li>
              <li>Security and fraud prevention</li>
              <li>Resolving disputes</li>
              <li>Complying with legal and regulatory obligations</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              The retention period may vary depending on the type of
              information and the purpose for which it is processed.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              9. Cookies and Similar Technologies
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              OutbidInd may use cookies, local storage, and similar
              technologies where necessary to:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Keep users signed in</li>
              <li>Maintain sessions</li>
              <li>Provide essential website functionality</li>
              <li>Remember certain preferences</li>
              <li>Improve website performance</li>
              <li>Maintain security</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              You may be able to control cookies through your browser
              settings. However, disabling certain cookies or storage
              technologies may affect some website functionality.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              10. Your Privacy Rights and Choices
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Depending on applicable law, you may have rights regarding your
              personal information.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              These may include the ability to:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Request information about personal data we process about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of personal information where applicable</li>
              <li>Withdraw consent where processing is based on consent</li>
              <li>Raise a privacy-related concern or complaint</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              To make a privacy-related request, please contact us using the
              contact information provided below.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              We may need to verify your identity before processing certain
              requests.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              11. Children&apos;s Privacy
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              OutbidInd is not intended to knowingly collect personal
              information from children in violation of applicable law.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              If you believe that a child has provided personal information to
              us without appropriate authorization, please contact us so that
              we can review and take appropriate action where required.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              12. Data Transfers and Third-Party Processing
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Some of the service providers used by OutbidInd may process
              information through infrastructure located outside your state
              or country.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              Where applicable, such processing will be carried out in
              accordance with applicable laws and appropriate contractual,
              technical, or organizational safeguards.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              13. Changes to This Privacy Policy
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              We may update this Privacy Policy from time to time to reflect:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">
              <li>Changes to our services</li>
              <li>Changes to our technology</li>
              <li>Changes to our data practices</li>
              <li>Changes in applicable laws or regulations</li>
            </ul>

            <p className="mt-4 leading-7 text-slate-600">
              When we make changes, we may update the &quot;Last Updated&quot;
              date shown at the top of this page.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-950">
              14. Contact Us
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal information, you can contact us
              at:
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="font-bold text-slate-950">OutbidInd</p>

              <p className="mt-2 text-slate-600">
                Email:{" "}
                <a
                  href="mailto:outbidind.ofc@gmail.com"
                  className="font-semibold text-[#d94d28] hover:underline"
                >
                  outbidind.ofc@gmail.com
                </a>
              </p>
            </div>
          </section>

          {/* TRUST BOX */}
          <section className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Image
                src="/logo.png"
                alt="OutbidInd"
                width={38}
                height={38}
                className="h-10 w-10 object-contain"
              />
            </div>

            <h2 className="text-2xl font-bold text-slate-950">
              Your Data. Your Trust. Our Responsibility.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
              At OutbidInd, we believe that trust is an important part of
              building a reliable online marketplace. We aim to collect and
              use information responsibly, protect our platform from misuse,
              and provide transparency about how information is handled.
            </p>

            <p className="mt-5 font-semibold text-slate-900">
              Your privacy matters to us.
            </p>
          </section>
        </div>
      </article>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="OutbidInd Home"
          >
            <Image
              src="/logo.png"
              alt="OutbidInd"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />

            <span className="text-lg font-bold">
              <span className="text-slate-900">Outbid</span>
              <span className="text-[#d94d28]">Ind</span>
            </span>
          </Link>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-[#d94d28]">
              Home
            </Link>

            <Link href="/live-bids" className="hover:text-[#d94d28]">
              Live Bids
            </Link>

            <Link href="/list-your-business" className="hover:text-[#d94d28]">
              List Your Business
            </Link>

            <Link href="/terms" className="hover:text-[#d94d28]">
              Terms
            </Link>

            <Link href="/privacy" className="text-[#d94d28]">
              Privacy
            </Link>
          </div>

          <p className="text-sm text-slate-400">© 2026 OutbidInd</p>
        </div>
      </footer>
    </main>
  );
}