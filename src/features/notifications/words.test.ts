import type { Notification } from "@/api/types";
import { setFormatSettings } from "@/format/time";
import { describe as describeNote, type Reader } from "./words";

beforeAll(() => setFormatSettings({ timeZone: "Asia/Beirut", use24HourTime: false, weekStart: 1 }));

const designer: Reader = { userId: 4, isAdmin: false, logsWork: true, domain: "design" };
const siteStaff: Reader = { userId: 5, isAdmin: false, logsWork: false, domain: "execution" };

const note = (kind: string, change: Partial<Notification> = {}): Notification => ({
  id: 1,
  kind,
  actor: { id: 2, name: "Nadia Test", photoFileId: null },
  project: { id: 7, title: "Villa Haddad", domain: "design", icon: null, tint: null },
  subjectType: null,
  subjectId: null,
  payload: {},
  count: 1,
  createdAt: "2026-10-08T06:00:00Z",
  readAt: null,
  ...change,
});

it("words an assigned requirement like the web and opens it highlighted", () => {
  const view = describeNote(
    note("requirement_assigned", {
      subjectType: "requirement",
      subjectId: 31,
      payload: { text: "Finish the kitchen", deadline: "2026-10-12" },
    }),
    designer,
  );
  expect(view.text).toBe("Nadia Test assigned you a requirement on Villa Haddad");
  expect(view.sub).toBe("Finish the kitchen · due Oct 12");
  expect(view.target).toEqual({
    type: "requirement",
    projectId: 7,
    requirementId: 31,
    domain: "design",
  });
});

it("tells someone who logs work they can log on a new project", () => {
  expect(describeNote(note("project_created"), designer).sub).toBe(
    "Created by Nadia Test · you can log work against it now",
  );
  expect(describeNote(note("project_created"), siteStaff).sub).toBe("Created by Nadia Test");
});

it("opens a submitted labour week on its week", () => {
  const view = describeNote(
    note("labour_week_submitted", {
      project: { id: 9, title: "Faqra", domain: "execution", icon: null, tint: null },
      payload: { weekStart: "2026-10-05", updated: true },
    }),
    siteStaff,
  );
  expect(view.text).toBe("Nadia Test updated a labour report for Faqra");
  expect(view.target).toEqual({ type: "labour_week", projectId: 9, weekStart: "2026-10-05" });
});

it("opens a comment on the person's entry", () => {
  const view = describeNote(
    note("entry_comment", { subjectId: 50, payload: { text: "Nice" } }),
    designer,
  );
  expect(view.target).toEqual({ type: "work_entry", id: 50 });
});

it("words the client portal and file comments, and opens the project", () => {
  const openProject = { type: "project", id: 7, domain: "design" };
  const message = describeNote(
    note("portal_client_message", { payload: { authorName: "Hala Rizk" } }),
    designer,
  );
  expect(message).toMatchObject({
    text: "Hala Rizk sent a message in Villa Haddad's client portal",
    icon: "chat",
    target: openProject,
  });
  expect(describeNote(note("portal_client_message", { count: 3 }), designer).text).toBe(
    "3 new client messages in Villa Haddad",
  );

  expect(
    describeNote(note("portal_client_comment", { payload: { itemTitle: "Plan.pdf" } }), designer)
      .text,
  ).toBe("Nadia Test commented on Plan.pdf in Villa Haddad");
  expect(describeNote(note("portal_client_comment", { count: 2 }), designer).text).toBe(
    "2 new client comments on a file in Villa Haddad",
  );

  expect(
    describeNote(note("portal_mention", { payload: { authorName: "Hala Rizk" } }), designer),
  ).toMatchObject({
    text: "Hala Rizk mentioned you in Villa Haddad's client portal",
    target: openProject,
  });

  expect(
    describeNote(note("project_file_comment", { payload: { fileTitle: "Moodboard" } }), designer)
      .text,
  ).toBe("Nadia Test commented on Moodboard in Villa Haddad");
  expect(describeNote(note("project_file_comment", { count: 4 }), designer).text).toBe(
    "4 new comments on a file in Villa Haddad",
  );
});

it("falls back to the kind in words", () => {
  expect(describeNote(note("something_new"), designer).text).toBe("Something new");
});
