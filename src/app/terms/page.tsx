import { LegalDocument } from "@/components/legal/legal-document";

const sections = [
  {
    heading: "Last Updated: June 2026",
    paragraphs: [
      "Welcome to uniqueKontent.",
      "By creating an account, submitting content, or using this platform, you agree to these Terms of Service.",
    ],
  },
  {
    heading: "1. Purpose of the Platform",
    paragraphs: [
      "uniqueKontent exists to support independent artists, music creators, and the wider creator community.",
      "The platform provides tools for:",
    ],
    bullets: [
      "Music submissions",
      "Show participation",
      "Community notices",
      "Artist discovery",
      "Show archives",
    ],
  },
  {
    heading: "2. User Conduct",
    paragraphs: ["Users must not:"],
    bullets: [
      "Upload illegal content.",
      "Upload copyrighted material they do not own or have permission to use.",
      "Upload malware, malicious links, or harmful software.",
      "Harass, threaten, intimidate, or target other users.",
      "Attempt to gain unauthorised access to accounts, systems, or data.",
      "Use the platform for fraud, scams, or deceptive practices.",
    ],
  },
  {
    heading: "3. Drugs, Violence and Illegal Activity",
    paragraphs: [
      "uniqueKontent and its community do not promote, encourage, organise, facilitate, or endorse:",
      "Content may contain artistic themes, storytelling, satire, or creative expression. However, content that actively promotes or encourages illegal activity may be removed.",
    ],
    bullets: [
      "Illegal drug use.",
      "Violence against individuals or groups.",
      "Criminal activity.",
      "Extremism.",
      "Hate speech.",
      "Terrorism.",
      "Self-harm.",
      "Any unlawful activity.",
    ],
  },
  {
    heading: "4. Music Submissions",
    paragraphs: [
      "By submitting a track, you confirm that:",
      "Administrators and moderators may remove submissions that violate these Terms or the show's submission rules.",
    ],
    bullets: [
      "The track is your work, or you have permission to submit it.",
      "You have the legal right to share the content.",
      "The submission does not infringe copyright.",
      "Submission does not guarantee inclusion in any show.",
    ],
  },
  {
    heading: "5. Moderation",
    paragraphs: [
      "Moderators may:",
      "Moderation decisions are made to protect the community and maintain platform integrity.",
    ],
    bullets: [
      "Remove submissions.",
      "Reject submissions.",
      "Suspend accounts.",
      "Restrict access where necessary.",
    ],
  },
  {
    heading: "6. Accounts",
    paragraphs: [
      "Users are responsible for maintaining the security of their account.",
      "Users must not:",
    ],
    bullets: [
      "Share accounts.",
      "Impersonate others.",
      "Attempt to bypass suspensions or restrictions.",
    ],
  },
  {
    heading: "7. Service Availability",
    paragraphs: ['The platform is provided on an "as available" basis.', "We may:"],
    bullets: [
      "Update features.",
      "Modify services.",
      "Perform maintenance.",
      "Suspend services temporarily.",
    ],
  },
  {
    heading: "8. Limitation of Liability",
    paragraphs: [
      "Use of the platform is at your own risk.",
      "uniqueKontent and its administrators are not liable for:",
    ],
    bullets: [
      "Data loss.",
      "Service interruptions.",
      "User-generated content.",
      "Third-party websites or services linked through the platform.",
    ],
  },
  {
    heading: "9. Changes to These Terms",
    paragraphs: [
      "These Terms may be updated from time to time.",
      "Continued use of the platform after updates constitutes acceptance of the revised Terms.",
    ],
  },
  {
    heading: "10. Contact",
    paragraphs: [
      "Questions regarding these Terms may be directed through the platform's official contact methods.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms of Service"
      intro="The rules and responsibilities for using uniqueKontent."
      sections={sections}
    />
  );
}
