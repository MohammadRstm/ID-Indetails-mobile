// Ported from the web client: src/domains/shared/notifications/notificationWords.ts (see docs/ported-from-web.md).
// The words are the web's; instead of a web address, each notification names its target (src/navigation/targets.ts),
// which the phone opens if the reader's permissions allow.
import type { PushTarget } from "@/api/mobileTypes";
import type { Notification } from "@/api/types";
import {
  companyToday,
  dayKey,
  daysBetween,
  fmtDate,
  fmtDayDate,
  fmtDur,
  fmtH,
  fmtMonthY,
  fmtRange,
} from "@/format/time";
import type { IconName } from "@/ui";

/** Who is reading: their words ("your", "you can log work") depend on it. */
export type Reader = {
  userId: number;
  isAdmin: boolean;
  /** They log Design work: the words about logging are for them. */
  logsWork: boolean;
  /** Their own domain; a notification about a project uses the project's. */
  domain: "design" | "execution" | null;
};

export type NotificationView = {
  text: string;
  sub?: string;
  icon: IconName;
  /** What a tap opens, if anything. Checked against the reader's permissions before going. */
  target: PushTarget | null;
};

type Payload = Record<string, unknown>;
type Domain = "design" | "execution";

const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown) => (typeof v === "number" ? v : 0);
const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
const ROLE: Record<string, string> = {
  super_admin: "super admin",
  admin: "admin",
  employee: "employee",
};
const AREA: Record<string, string> = { design: "Design", execution: "Execution" };

/** The words, icon and target of a notification, in the web's voice. Amounts are never in one. */
export function describe(note: Notification, reader: Reader): NotificationView {
  const p = (note.payload ?? {}) as Payload;
  const who = note.actor?.name ?? "Someone";
  const title = note.project?.title ?? s(p.projectTitle);
  const domain = (note.project?.domain as Domain | undefined) ?? reader.domain;
  const projectId = note.project?.id;
  const project = (
    section?: "requirements" | "meetings" | "materials" | "labour",
  ): PushTarget | null =>
    projectId && domain ? { type: "project", id: projectId, domain, section } : null;
  const requirement = (): PushTarget | null =>
    projectId && domain && note.subjectType === "requirement" && note.subjectId
      ? { type: "requirement", projectId, requirementId: note.subjectId, domain }
      : project("requirements");
  const subject = (
    type: "invoice" | "payment" | "statement" | "client" | "person" | "work_entry",
  ) => (note.subjectId ? ({ type, id: note.subjectId } as PushTarget) : null);
  const logsWork = reader.logsWork && domain === "design";
  const myWork: PushTarget | null = reader.logsWork ? { type: "page", page: "work" } : null;
  const by = note.actor ? `By ${who}` : undefined;

  switch (note.kind) {
    case "requirement_assigned":
      return {
        text: `${who} assigned you a requirement on ${title}`,
        sub: `${s(p.text)}${p.deadline ? ` · due ${fmtDate(s(p.deadline))}` : ""}`,
        icon: "checkCircle",
        target: requirement(),
      };
    case "requirements_added":
      return {
        text:
          note.count > 1
            ? `${note.count} requirements added to ${title}`
            : `A requirement was added to ${title}`,
        sub: p.latestText ? `Latest: ${s(p.latestText)}` : undefined,
        icon: "checkCircle",
        target: requirement(),
      };
    case "requirement_done":
      return {
        text: `${who} completed a requirement on ${title}`,
        sub: s(p.text),
        icon: "checkCircle",
        target: requirement(),
      };
    case "requirement_due_soon":
      return {
        text: `A requirement on ${title} is due tomorrow`,
        sub: s(p.text),
        icon: "clock",
        target: requirement(),
      };
    case "requirement_overdue":
      return {
        text: `A requirement on ${title} is overdue`,
        sub: `${s(p.text)}${p.deadline ? ` · was due ${fmtDate(s(p.deadline))}` : ""}`,
        icon: "alert",
        target: requirement(),
      };

    case "work_logged":
      return {
        text: `${s(p.authorName) || who} logged ${fmtDur(n(p.minutes))} on ${title}`,
        sub: s(p.description) || undefined,
        icon: "clock",
        target: subject("work_entry"),
      };
    case "work_digest": {
      const day = dayKey(note.createdAt);
      return {
        text: `${day === companyToday() ? "Today's work" : `Work on ${fmtDate(day)}`}: ${plural(note.count, "entry", "entries")} logged · ${fmtDur(n(p.minutes))}`,
        sub: p.latestName
          ? `Latest: ${s(p.latestName)} on ${s(p.projectTitle) || title}`
          : undefined,
        icon: "clock",
        target: null,
      };
    }
    case "entry_comment":
      return {
        text: `${s(p.authorName) || who} commented on your work entry`,
        sub: `${s(p.entryDescription)}${p.text ? ` - “${s(p.text)}”` : ""}`,
        icon: "chat",
        target: subject("work_entry"),
      };
    case "weekly_summary":
      return {
        text: `Weekly summary: you logged ${fmtDur(n(p.minutes))} last week`,
        sub: `Across ${plural(n(p.projects), "project")} · ${plural(n(p.entries), "entry", "entries")}`,
        icon: "reports",
        target: myWork,
      };

    case "meeting_scheduled": {
      const start = s(p.startsAt);
      const end = s(p.endsAt);
      return {
        text: `${s(p.authorName) || who} scheduled a meeting on ${title}`,
        sub: start
          ? `${fmtDayDate(start)} · ${fmtRange(start, end || start)}${p.topic ? ` · ${s(p.topic)}` : ""}`
          : undefined,
        icon: "calendar",
        target: project("meetings") ?? { type: "page", page: "meetings" },
      };
    }
    case "materials_added":
      return {
        text: `${who} added ${plural(n(p.count), "material")} to ${title}`,
        icon: "list",
        target: project("materials"),
      };
    case "labour_week_submitted":
      return {
        text: `${who} ${p.updated ? "updated" : "submitted"} a labour report for ${title}`,
        sub: p.weekStart ? `Week of ${fmtDate(s(p.weekStart))}` : undefined,
        icon: "projects",
        target:
          projectId && p.weekStart
            ? { type: "labour_week", projectId, weekStart: s(p.weekStart) }
            : project("labour"),
      };

    case "project_created":
      return {
        text: `New project added: ${title}`,
        sub: `Created by ${who}${logsWork ? " · you can log work against it now" : ""}`,
        icon: "projects",
        target: project(),
      };
    case "project_status_changed": {
      const change = s(p.change);
      const text =
        change === "complete"
          ? `${title} was marked completed`
          : change === "hold"
            ? `${title} was put on hold`
            : change === "resume"
              ? `${title} was resumed`
              : `${title} was reopened`;
      const sub = !logsWork
        ? by
        : change === "complete"
          ? "It has been removed from your active projects - your logged work is still in My Work"
          : change === "hold"
            ? "New work entries are paused until it resumes"
            : "You can log work against it again";
      return { text, sub, icon: "projects", target: project() };
    }
    case "project_owner_set":
      return {
        text: `You're now the owner of ${title}`,
        sub: by ? `Set by ${who}` : undefined,
        icon: "projects",
        target: project(),
      };
    case "project_nearly_done":
      return {
        text: `${title} reached ${n(p.progressPct)}% progress`,
        sub: "Ready to close out?",
        icon: "trendUp",
        target: project(),
      };
    case "project_idle":
      return {
        text: `${title} has had no work logged for ${n(p.days)} days`,
        sub: p.lastWorkOn ? `Last entry: ${fmtDate(s(p.lastWorkOn))}` : "Nothing logged on it yet",
        icon: "trendUp",
        target: project(),
      };
    case "project_cost_high":
      return {
        text: `${title} has used ${n(p.usedPct)}% of its payment in cost`,
        sub: "Worth a look before it runs over",
        icon: "trendUp",
        target: project(),
      };
    case "project_closed":
      return {
        text: `${title} closed at ${n(p.marginPct)}% margin`,
        sub: by,
        icon: "trendUp",
        target: project(),
      };

    case "invoice_issued":
      return {
        text: `${s(p.number) || "An invoice"} was issued`,
        sub: `${title}${note.actor ? ` · by ${who}` : ""}`,
        icon: "file",
        target: subject("invoice") ?? project(),
      };
    case "invoice_overdue": {
      const days = p.dueOn ? daysBetween(s(p.dueOn), companyToday()) : 0;
      return {
        text: `${s(p.number) || "An invoice"} is ${days > 0 ? `${plural(days, "day")} overdue` : "overdue"}`,
        sub: title,
        icon: "alert",
        target: subject("invoice") ?? project(),
      };
    }
    case "invoice_sent_automatically":
      return {
        text: p.to
          ? `${s(p.number) || "An invoice"} was emailed to ${s(p.to)}`
          : `${s(p.number) || "An invoice"} was issued - already paid on account, so not emailed`,
        sub: `${title} · as you scheduled`,
        icon: "send",
        target: subject("invoice") ?? project(),
      };
    case "invoice_send_due":
      return {
        text: `A scheduled invoice on ${title} is due to go out`,
        sub: "There's no email address to send it to - send it yourself",
        icon: "calendar",
        target: subject("invoice") ?? project(),
      };
    case "invoice_send_failed":
      return {
        text: `A scheduled invoice on ${title} couldn't be emailed`,
        sub: `${p.sendTo ? `To ${s(p.sendTo)} · ` : ""}it is tried again every hour`,
        icon: "alert",
        target: subject("invoice") ?? project(),
      };
    case "invoice_reminder_due":
      return {
        text: `${s(p.number) || "An invoice"} is due a reminder`,
        sub: `${title} · the client has no email address - chase it yourself`,
        icon: "alert",
        target: subject("invoice") ?? project(),
      };
    case "invoice_draft_waiting":
      return {
        text: `A draft invoice on ${title} is still waiting`,
        sub: p.createdOn
          ? `Drafted ${fmtDate(s(p.createdOn))} · ready to send to the client`
          : "Ready to send to the client",
        icon: "file",
        target: subject("invoice") ?? project(),
      };
    case "payment_recorded":
      return {
        text: `A payment was recorded on ${title}`,
        sub: `${p.invoiceNumber ? `Against ${s(p.invoiceNumber)}` : p.isInitial ? "The initial payment" : "On account"}${note.actor ? ` · by ${who}` : ""}`,
        icon: "card",
        target: project(),
      };
    case "statement_sent":
      return {
        text: `${s(p.number) || "A statement"} was sent to the client`,
        sub: `${title}${note.actor ? ` · by ${who}` : ""}`,
        icon: "file",
        target: subject("statement") ?? project(),
      };
    case "client_added":
      return {
        text: `${s(p.organisation) || s(p.name) || "A client"} added as a client`,
        sub: by,
        icon: "briefcase",
        target: subject("client"),
      };

    // the phone has no client portal or project files tab: these open the project
    case "portal_client_message":
      return {
        text:
          note.count > 1
            ? `${note.count} new client messages in ${title}`
            : `${s(p.authorName) || who} sent a message in ${title}'s client portal`,
        icon: "chat",
        target: project(),
      };
    case "portal_client_comment":
      return {
        text:
          note.count > 1
            ? `${note.count} new client comments on ${s(p.itemTitle) || "a file"} in ${title}`
            : `${s(p.authorName) || who} commented on ${s(p.itemTitle) || "a file"} in ${title}`,
        icon: "chat",
        target: project(),
      };
    case "portal_mention":
      return {
        text: `${s(p.authorName) || who} mentioned you in ${title}'s client portal`,
        icon: "chat",
        target: project(),
      };
    case "project_file_comment":
      return {
        text:
          note.count > 1
            ? `${note.count} new comments on ${s(p.fileTitle) || "a file"} in ${title}`
            : `${s(p.authorName) || who} commented on ${s(p.fileTitle) || "a file"} in ${title}`,
        icon: "chat",
        target: project(),
      };

    case "invitation_accepted": {
      const role = ROLE[s(p.role)];
      return {
        text: `${who} accepted their invitation`,
        sub:
          [role ? `${role[0].toUpperCase()}${role.slice(1)}` : null, AREA[s(p.domain)] ?? null]
            .filter(Boolean)
            .join(" · ") || undefined,
        icon: "userPlus",
        target: subject("person"),
      };
    }
    case "role_changed": {
      const to = ROLE[s(p.to)] ?? s(p.to);
      return {
        text: `You're now ${/^[aeiou]/.test(to) ? "an" : "a"} ${to}`,
        sub: p.automatic ? "After a change to your permissions" : by,
        icon: "shield",
        target: null,
      };
    }
    case "domain_changed":
      return {
        text: `You were moved to ${AREA[s(p.to)] ?? "another business"}`,
        sub: by,
        icon: "shield",
        target: { type: "page", page: "today" },
      };
    case "team_changed":
      return {
        text:
          p.teamId == null ? "You were taken out of your team" : "You were moved to another team",
        sub: by,
        icon: "people",
        target: null,
      };
    case "permissions_changed": {
      const count = (key: string) => (p[key] as unknown[] | undefined)?.length ?? 0;
      const parts = [
        count("granted") ? `${count("granted")} granted` : null,
        count("revoked") ? `${count("revoked")} taken away` : null,
        count("reset") ? "some reset to your role's" : null,
      ].filter(Boolean);
      return {
        text: "Your permissions changed",
        sub: [parts.join(" · "), by].filter(Boolean).join(" · ") || undefined,
        icon: "shield",
        target: null,
      };
    }
    case "pay_changed": {
      const from = s(p.effectiveFrom);
      return {
        text:
          from && from > companyToday()
            ? `Your pay changes from ${fmtDate(from)}`
            : `Your pay changed${from ? ` from ${fmtDate(from)}` : ""}`,
        sub: by,
        icon: "card",
        target: myWork,
      };
    }
    case "schedule_changed": {
      const from = s(p.effectiveFrom);
      const when = from ? ` from ${fmtDate(from)}` : "";
      return {
        text: p.followsDefault
          ? `You're back on the company's working week${when}`
          : `Your working schedule changes${when}`,
        sub: by,
        icon: "calendar",
        target: myWork,
      };
    }
    case "hours_excused": {
      const month = s(p.month);
      const paid = p.isPaid !== false;
      const days = (p.days as unknown[] | undefined)?.length ?? 0;
      const text =
        p.kind === 2
          ? `${fmtMonthY(month)} ${paid ? "excused" : "marked unpaid"} as a whole`
          : p.kind === 1
            ? `${plural(days, paid ? "day off" : "unpaid day off", paid ? "days off" : "unpaid days off")}${paid ? " excused" : ""} in ${fmtMonthY(month)}`
            : `${fmtH(n(p.minutes))} ${paid ? "excused" : "of unpaid leave"} in ${fmtMonthY(month)}`;
      return { text, sub: by, icon: "checkCircle", target: myWork };
    }
    case "hours_short": {
      const people = (p.people as { name?: string; shortMinutes?: number }[] | undefined) ?? [];
      const count = n(p.count) || people.length;
      return {
        text: `${plural(count, "employee")} finished ${fmtMonthY(s(p.month))} short of their hours`,
        sub:
          people
            .slice(0, 3)
            .map((x) => `${(x.name ?? "").split(" ")[0]} ${fmtH(x.shortMinutes ?? 0)}`)
            .join(" · ") || undefined,
        icon: "people",
        target: { type: "page", page: "company" },
      };
    }
    default:
      return {
        text: note.kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
        icon: "bell",
        target: project(),
      };
  }
}
