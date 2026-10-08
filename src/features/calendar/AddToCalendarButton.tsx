import { useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/ui";
import { AddToCalendarView, type AddToCalendarState } from "./components/AddToCalendarView";
import { addToDeviceCalendar } from "./deviceCalendar";

/**
 * Something to put in the phone's calendar. Times are UTC ISO strings, as the API sends them. For an all-day
 * event (a deadline), `startsAt` (and `endsAt`, the last day) may also be a "yyyy-MM-dd" company day.
 */
export type CalendarEvent = {
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  notes?: string;
};

export type AddToCalendarButtonProps = { event: CalendarEvent };

/** "Add to calendar", on the meeting screen and requirement rows with a deadline. */
export function AddToCalendarButton({ event }: AddToCalendarButtonProps) {
  const [state, setState] = useState<AddToCalendarState>("idle");

  const add = async () => {
    setState("adding");
    try {
      const result = await addToDeviceCalendar(event);
      if (result === "added") {
        setState("added");
        toast({ text: "Added to your calendar", icon: "check" });
      } else if (result === "denied") {
        setState("denied");
      } else {
        setState("idle");
        toast({ text: "This phone has no calendar to add it to", icon: "alert" });
      }
    } catch {
      setState("idle");
      toast({ text: "Couldn't add it to your calendar", icon: "alert" });
    }
  };

  return (
    <AddToCalendarView
      state={state}
      onAdd={() => void add()}
      onOpenSettings={() => void Linking.openSettings()}
    />
  );
}
