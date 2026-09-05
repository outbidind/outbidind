import type { ReactNode } from "react";

type TermsSectionProps = {
  title: string;
  children: ReactNode;
};

function TermsSection({ title, children }: TermsSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <div className="space-y-2 text-[11px] leading-5 text-slate-600">
        {children}
      </div>
    </section>
  );
}

export const TERMS_VERSION = "1.0";

export default function TermsContent() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d94d28]">
          OutbidInd Terms & Conditions
        </p>

        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          Terms & Conditions
        </h1>

        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          Last updated: September 2026
        </p>
      </div>

      <TermsSection title="1. About OutbidInd">
        <p>
          OutbidInd is a marketplace platform that allows users to discover
          business opportunities, view business listings, and participate in
          bidding activities where available.
        </p>
        <p>
          OutbidInd provides the platform and related services. A listing does
          not by itself guarantee ownership, transfer, purchase, partnership,
          investment, or any other transaction unless separately agreed through
          an applicable process.
        </p>
      </TermsSection>

      <TermsSection title="2. Eligibility">
        <p>
          You must be legally capable of entering into an agreement under the
          laws applicable to you to use OutbidInd.
        </p>
        <p>
          By creating or using an account, you confirm that the information you
          provide is accurate and that you are permitted to use the platform.
        </p>
      </TermsSection>

      <TermsSection title="3. Account Registration">
        <p>
          Certain OutbidInd features require an account. You are responsible
          for maintaining the confidentiality of your login credentials and
          for activities performed through your account.
        </p>
        <p>
          You must not create accounts using false identities, impersonate
          another person or organization, or knowingly provide misleading
          information.
        </p>
      </TermsSection>

      <TermsSection title="4. Business Listings">
        <p>
          Business owners or authorized users may submit business information
          for consideration on OutbidInd.
        </p>
        <p>
          The person submitting a listing is responsible for ensuring that the
          submitted business information is accurate, lawful, and that they
          have the appropriate authority to submit it.
        </p>
        <p>
          OutbidInd may review, screen, approve, reject, restrict, modify, or
          remove listings where appropriate.
        </p>
      </TermsSection>

      <TermsSection title="5. Website and Security Screening">
        <p>
          Business websites and submitted information may be subject to
          automated security and safety checks before a listing becomes
          available on the marketplace.
        </p>
        <p>
          Passing a security check does not constitute a guarantee that a
          business, website, person, or transaction is completely safe,
          legitimate, or suitable for every user.
        </p>
      </TermsSection>

      <TermsSection title="6. Listing Approval and Availability">
        <p>
          OutbidInd may approve or reject listings according to its platform
          processes, security requirements, moderation decisions, and other
          applicable criteria.
        </p>
        <p>
          An approved listing may subsequently become unavailable, restricted,
          closed, or removed.
        </p>
      </TermsSection>

      <TermsSection title="7. Live Listings">
        <p>
          A listing marked as live is available for participation according to
          the features and rules displayed by OutbidInd.
        </p>
        <p>
          Availability and marketplace information may change over time.
          Users should review the information shown on the relevant listing
          before participating.
        </p>
      </TermsSection>

      <TermsSection title="8. Bidding Rules">
        <p>
          OutbidInd uses an accumulated-total bidding model. It is not a
          traditional highest-bid auction model.
        </p>
        <p>
          The minimum bid amount is ₹99 unless OutbidInd explicitly displays a
          different minimum for a particular feature.
        </p>
        <p>
          A successful bid adds the bid amount to the applicable auction's
          accumulated total. For example, ₹99 followed by ₹150 results in an
          accumulated total of ₹249.
        </p>
        <p>
          Failed, cancelled, or unverified bids do not qualify as successful
          bids.
        </p>
      </TermsSection>

      <TermsSection title="9. Successful Bids">
        <p>
          A bid is considered successful only when the applicable OutbidInd
          payment and server-side verification processes have successfully
          completed.
        </p>
        <p>
          Information displayed by the platform may be updated as the
          underlying marketplace data changes.
        </p>
      </TermsSection>

      <TermsSection title="10. No Traditional Highest-Bid Rule">
        <p>
          The amount displayed as the current auction total represents the
          accumulated successful bid amounts. It should not be interpreted as
          the amount of the latest bid or as a traditional highest-bid price.
        </p>
      </TermsSection>

      <TermsSection title="11. Self-Bidding">
        <p>
          Subject to applicable law and platform rules, a business owner may
          participate in bidding on their own business listing.
        </p>
      </TermsSection>

      <TermsSection title="12. Bidding Conduct">
        <p>
          Users must not manipulate, abuse, disrupt, or attempt to circumvent
          the bidding system, payment verification, security controls,
          authentication, or other platform safeguards.
        </p>
        <p>
          Automated abuse, fraudulent activity, unauthorized access attempts,
          or other conduct that may compromise the platform may result in
          account restriction or termination.
        </p>
      </TermsSection>

      <TermsSection title="13. User-Submitted Content">
        <p>
          You remain responsible for information and content that you submit to
          OutbidInd.
        </p>
        <p>
          By submitting content for use on the platform, you represent that
          you have the right to provide that content and that it does not
          knowingly violate applicable law or the rights of others.
        </p>
      </TermsSection>

      <TermsSection title="14. Business Information Accuracy">
        <p>
          OutbidInd does not independently guarantee the accuracy,
          completeness, ownership, financial condition, profitability,
          valuation, or performance of every business or listing displayed on
          the platform.
        </p>
        <p>
          Users should independently evaluate business information and conduct
          appropriate due diligence before making decisions.
        </p>
      </TermsSection>

      <TermsSection title="15. Third-Party Websites">
        <p>
          Listings may contain links to third-party websites. OutbidInd does
          not control those websites and is not responsible for their content,
          security, availability, privacy practices, or terms.
        </p>
      </TermsSection>

      <TermsSection title="16. Intellectual Property">
        <p>
          OutbidInd and its associated branding, software, interface, design,
          text, graphics, and other platform materials may be protected by
          applicable intellectual-property laws.
        </p>
        <p>
          You may not copy, reproduce, modify, distribute, reverse engineer,
          or commercially exploit protected platform materials without
          appropriate authorization.
        </p>
      </TermsSection>

      <TermsSection title="17. Prohibited Activities">
        <p>Users must not use OutbidInd to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>commit or facilitate unlawful activity;</li>
          <li>submit knowingly false or misleading information;</li>
          <li>impersonate another person or business;</li>
          <li>attempt unauthorized access to accounts or systems;</li>
          <li>interfere with platform operations or security;</li>
          <li>use automated methods to abuse marketplace functionality;</li>
          <li>circumvent payment, authentication, or security controls.</li>
        </ul>
      </TermsSection>

      <TermsSection title="18. Platform Security">
        <p>
          OutbidInd uses technical and organizational safeguards intended to
          protect the platform and user information.
        </p>
        <p>
          No internet-based service can guarantee absolute security. Users
          should protect their account credentials and promptly report
          suspicious activity.
        </p>
      </TermsSection>

      <TermsSection title="19. Platform Availability">
        <p>
          OutbidInd may occasionally be unavailable because of maintenance,
          technical problems, third-party services, network issues, security
          events, or circumstances outside its reasonable control.
        </p>
      </TermsSection>

      <TermsSection title="20. Account Suspension or Termination">
        <p>
          OutbidInd may restrict, suspend, or terminate an account where it
          reasonably believes that the user has violated these Terms, abused
          the platform, engaged in fraudulent or unlawful activity, or created
          a security or operational risk.
        </p>
      </TermsSection>

      <TermsSection title="21. No Refunds">
        <p>
          OutbidInd does not provide refunds for payments made through the
          platform, except where a refund is expressly required by applicable
          law.
        </p>
      </TermsSection>

      <TermsSection title="22. Disclaimer">
        <p>
          OutbidInd is provided on an “as available” and “as is” basis to the
          extent permitted by applicable law.
        </p>
        <p>
          OutbidInd does not guarantee that every listing, business,
          opportunity, website, user, or marketplace interaction will meet a
          user's expectations or objectives.
        </p>
      </TermsSection>

      <TermsSection title="23. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, OutbidInd will
          not be responsible for indirect, incidental, special, consequential,
          or similar losses arising from use of the platform.
        </p>
      </TermsSection>

      <TermsSection title="24. Privacy">
        <p>
          Your use of OutbidInd is also subject to the OutbidInd Privacy Policy
          and applicable privacy laws.
        </p>
      </TermsSection>

      <TermsSection title="25. Changes to These Terms">
        <p>
          OutbidInd may update these Terms from time to time. When material
          changes are made, users may be required to review and accept the
          updated version before continuing to use certain features.
        </p>
      </TermsSection>

      <TermsSection title="26. Governing Law">
        <p>
          These Terms are intended to be governed by the applicable laws of
          India, subject to any mandatory legal rights or requirements that
          apply to the user.
        </p>
      </TermsSection>

      <TermsSection title="27. Severability">
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, the remaining provisions will continue to the extent
          permitted by law.
        </p>
      </TermsSection>

      <TermsSection title="28. Entire Agreement">
        <p>
          These Terms, together with applicable policies referenced by them,
          constitute the agreement governing your use of the OutbidInd
          platform.
        </p>
      </TermsSection>

      <TermsSection title="29. Contact">
        <p>
          For questions regarding these Terms or the OutbidInd platform,
          contact OutbidInd through the contact information provided on the
          official platform.
        </p>
      </TermsSection>

      <TermsSection title="30. User Acceptance">
        <p>
          By creating an account and using OutbidInd after being presented with
          these Terms, you acknowledge that you have read, understood, and
          agreed to these Terms & Conditions.
        </p>
      </TermsSection>
    </div>
  );
}