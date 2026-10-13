import { P } from "@/permissions/codes";
import type { Permissions } from "@/permissions/permissions";
import type { ProtonPageContext } from "./pageContext";

/*
 * What an empty chat says (ported from the web's greeting.ts): Proton's hello and a few questions to start with.
 * Written here, never by the model, and only questions whose answer this person may see.
 */

const MAX_STARTERS = 3;

function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Proton's hello, from the person's first name and the company's time of day: no model call. */
export function greetingFor(firstName: string | null | undefined, minuteOfDay: number): string {
  const part = partOfDay(Math.floor(minuteOfDay / 60));
  const name = firstName?.trim();
  return name ? `${part}, ${name}.` : `${part}.`;
}

/** A few questions to start with, for the page the person asked from. Sent as an ordinary question when picked. */
export function startersFor(page: ProtonPageContext | null, perms: Permissions): string[] {
  const hours = perms.canSeeDomain("design") && perms.has(P.WORK_ENTRY_VIEW_ALL);
  const money = perms.has(P.FINANCIAL_VIEW);
  const list: (string | false)[] = [];

  if (page?.entityType === "project") {
    list.push(
      "How is this project doing?",
      perms.has(P.REQUIREMENT_VIEW) && "What's still open on it?",
      hours && "Who has worked on it this month?",
    );
  } else if (page?.entityType === "client") {
    list.push(
      "What are this client's active projects?",
      money && "What does this client still owe?",
    );
  } else if (page?.page === "my_work") {
    list.push(
      perms.has(P.WORK_ENTRY_VIEW_OWN) && "How many hours have I logged this week?",
      perms.has(P.WORK_ENTRY_VIEW_OWN) && "Did I log work yesterday?",
    );
  } else if (page?.page === "messages") {
    list.push("Who has written to me?");
  } else if (page?.page === "notifications") {
    list.push("What are my latest notifications?");
  }

  list.push(
    "What needs my attention?",
    "What changed this week?",
    hours && "How did hours compare with last week?",
  );
  return [...new Set(list.filter((s): s is string => Boolean(s)))].slice(0, MAX_STARTERS);
}
