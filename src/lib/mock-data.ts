import type { AccountRole } from "@/lib/auth/roles";
import type { DashboardTask, Notice } from "@/lib/types";

export const notices: Notice[] = [
  {
    id: "notice-1",
    title: "Submission window is open",
    body: "Send tracks in before the Wednesday cutoff so the team can prep the queue.",
    tag: "Show Update",
    postedAt: "2 hours ago",
  },
  {
    id: "notice-2",
    title: "TOTN shortlist tonight",
    body: "Top listener picks will be highlighted on stream and pinned after the show.",
    tag: "Community",
    postedAt: "Earlier today",
  },
  {
    id: "notice-3",
    title: "Keep links stream-safe",
    body: "Use direct track or campaign links that the hosts can open quickly on mobile or desktop.",
    tag: "Reminder",
    postedAt: "Yesterday",
  },
];

export const dashboardTasks: DashboardTask[] = [
  {
    id: "task-1",
    title: "Check latest submission status",
    description: "See whether your newest track is still pending review or already in the show list.",
    status: "Ready",
  },
  {
    id: "task-2",
    title: "Review noticeboard updates",
    description: "Catch cutoff reminders and special show themes without digging through socials.",
    status: "Ready",
  },
  {
    id: "task-3",
    title: "Prepare TOTN nomination",
    description: "Bookmark your favourite tracks to nominate once the show starts.",
    status: "Waiting",
  },
];

export const adminHighlights = [
  { label: "Upcoming show", value: "Create one", tone: "accent" },
  { label: "New submissions", value: "Waiting for live data", tone: "warning" },
  { label: "Unplayed tracks", value: "No live queue yet", tone: "neutral" },
  { label: "TOTN nominations", value: "No live nominations", tone: "neutral" },
  { label: "Noticeboard posts", value: "3 pinned", tone: "neutral" },
  { label: "Manual queue", value: "Set up after testing", tone: "warning" },
] as const;

export function getNavItemsForRole(role: AccountRole | null, isSignedIn: boolean) {
  const sharedItems = [
    { href: "/", label: "Home" },
    { href: "/archive", label: "Archive" },
    { href: "/noticeboard", label: "Notices" },
    { href: "/totn", label: "TOTN" },
    { href: "/queue", label: "Queue" },
  ];

  if (!isSignedIn) {
    return [...sharedItems, { href: "/account", label: "Account" }];
  }

  if (role === "admin") {
    return [
      ...sharedItems,
      { href: "/admin", label: "Admin" },
      { href: "/account", label: "Account" },
    ];
  }

  return [
    ...sharedItems,
    { href: "/dashboard", label: "Dashboard" },
    { href: "/submit", label: "Submit" },
    { href: "/account", label: "Account" },
  ];
}
