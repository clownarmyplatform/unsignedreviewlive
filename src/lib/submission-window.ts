export type SubmissionWindowStatus = {
  show_id: string;
  show_title: string;
  show_date: string;
  submission_deadline: string | null;
  submission_limit: number;
  current_submission_count: number;
  places_left: number;
  is_open: boolean;
};

export function getSubmissionWindowMessage(
  status: SubmissionWindowStatus | null,
) {
  if (!status) {
    return "Submissions are not open right now.";
  }

  if (!status.is_open || status.places_left <= 0) {
    return "Sorry, the queue for this show is full";
  }

  return `${status.places_left} places left for ${status.show_title}`;
}
