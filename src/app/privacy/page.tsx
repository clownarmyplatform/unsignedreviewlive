import { LegalDocument } from "@/components/legal/legal-document";

const sections = [
  {
    heading: "Last Updated: June 2026",
  },
  {
    heading: "1. Overview",
    paragraphs: [
      "uniqueKontent respects your privacy.",
      "This policy explains what information we collect, why we collect it, and how it is used.",
    ],
  },
  {
    heading: "2. Information We Collect",
    paragraphs: ["Depending on your use of the platform, we may collect:"],
    subsections: [
      {
        heading: "Account Information",
        bullets: ["Username", "Display name", "Email address"],
      },
      {
        heading: "Submission Information",
        bullets: [
          "Artist names",
          "Track titles",
          "Submission links",
          "Messages provided during submission",
        ],
      },
      {
        heading: "Technical Information",
        bullets: [
          "Login timestamps",
          "Device information",
          "Browser information",
          "IP addresses where necessary for security",
        ],
      },
    ],
  },
  {
    heading: "3. How We Use Information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Operate the platform.",
      "Manage accounts.",
      "Process submissions.",
      "Provide moderation and security.",
      "Improve platform performance.",
      "Prevent abuse and misuse.",
    ],
  },
  {
    heading: "4. What We Do Not Do",
    paragraphs: [
      "We do not sell personal information.",
      "We do not knowingly share personal information with advertisers.",
      "We do not use personal information for unrelated commercial purposes.",
    ],
  },
  {
    heading: "5. Moderation and Safety",
    paragraphs: ["Account actions and moderation actions may be recorded to:"],
    bullets: [
      "Maintain community safety.",
      "Investigate abuse.",
      "Resolve disputes.",
      "Protect the platform.",
    ],
  },
  {
    heading: "6. Third-Party Services",
    paragraphs: [
      "The platform may use trusted third-party providers including services such as:",
      "These services may process information as necessary to provide their functionality.",
    ],
    bullets: [
      "Hosting providers",
      "Authentication providers",
      "Database providers",
      "Analytics providers",
    ],
  },
  {
    heading: "7. Data Retention",
    paragraphs: ["Information is retained only as long as reasonably necessary to:"],
    bullets: [
      "Operate the platform.",
      "Maintain records.",
      "Meet legal obligations.",
      "Protect the platform from abuse.",
    ],
  },
  {
    heading: "8. Security",
    paragraphs: [
      "Reasonable measures are taken to protect user data.",
      "However, no internet-based system can be guaranteed to be completely secure.",
    ],
  },
  {
    heading: "9. Your Rights",
    paragraphs: [
      "Where applicable, users may request:",
      "Requests may be subject to legal, security, or operational limitations.",
    ],
    bullets: [
      "Access to their data.",
      "Correction of inaccurate information.",
      "Deletion of personal information.",
      "Closure of their account.",
    ],
  },
  {
    heading: "10. Changes to This Policy",
    paragraphs: [
      "This policy may be updated periodically.",
      "Continued use of the platform after updates constitutes acceptance of the revised policy.",
    ],
  },
  {
    heading: "11. Contact",
    paragraphs: [
      "Privacy-related questions may be submitted through the platform's official contact methods.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Privacy Policy"
      intro="How uniqueKontent collects, uses, and protects information."
      sections={sections}
    />
  );
}
