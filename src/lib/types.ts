export type ShowInfo = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  theme: string;
  submissionDeadline: string;
  venue: string;
  notes: string[];
};

export type Submission = {
  id: string;
  artist: string;
  title: string;
  genre: string;
  status: "new" | "queued" | "played" | "reviewed";
  submittedAt: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  tag: string;
  postedAt: string;
};

export type Nomination = {
  id: string;
  track: string;
  artist: string;
  votes: number;
  reason: string;
};

export type QueueItem = {
  id: string;
  slot: string;
  artist: string;
  title: string;
  status: "queued" | "backup" | "opening";
};

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  status: "Ready" | "Waiting" | "Done";
};
