/** Something to put in the phone's calendar. Times are UTC ISO strings, as the API sends them. */
export type CalendarEvent = {
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  notes?: string;
};

export type AddToCalendarButtonProps = { event: CalendarEvent };

/** Slot: "Add to calendar", on the meeting screen and requirement rows with a deadline. Phase 2 renders it; Phase 5 fills it in. */
export function AddToCalendarButton(props: AddToCalendarButtonProps) {
  return null;
}
