import type { components } from "./schema";

/*
 * The API shapes the phone app adds (docs/contracts.md sections 2 and 3), written by hand until the API branch
 * is merged and `npm run api:types` generates them into schema.d.ts. Delete each one once it is generated.
 */

type Schemas = components["schemas"];

// ---------- mobile sign-in ----------

export type MobileAuthResponse = {
  accessToken: string;
  /** UTC. */
  accessTokenExpiresAt: string;
  refreshToken: string;
  /** UTC, 30 days from now. */
  refreshTokenExpiresAt: string;
  /** Exactly what GET /api/auth/me returns. */
  user: Schemas["CurrentUserResponse"];
};

export type MobileLoginRequest = { email: string; password: string };
export type MobileRefreshRequest = { refreshToken: string };
export type MobileLogoutRequest = { refreshToken: string };
export type MobileChangePasswordRequest = { currentPassword: string; newPassword: string };

// ---------- devices ----------

export type DevicePlatform = "ios" | "android";

export type RegisterDeviceRequest = {
  pushToken: string;
  platform: DevicePlatform;
  appVersion?: string;
};

export type DeviceResponse = {
  id: number;
  platform: DevicePlatform;
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
  /** True for the caller's own session. */
  current: boolean;
};

// ---------- notification settings ----------

export type NotificationCategory =
  "work" | "requirements" | "projects" | "meetings" | "sites" | "money" | "people" | "messages";

export type NotificationSettingsResponse = {
  /** Minutes after midnight, company time; both null = no quiet hours. A range may cross midnight. */
  quietFromMinute: number | null;
  quietToMinute: number | null;
  mutedCategories: NotificationCategory[];
  /** True while the person has never saved (22:00–07:00, nothing muted). */
  isDefault: boolean;
};

export type SaveNotificationSettingsRequest = {
  quietFromMinute: number | null;
  quietToMinute: number | null;
  mutedCategories: NotificationCategory[];
};

// ---------- materials and labour weeks: the fields the phone adds ----------

/** A material to add, with the phone's duplicate-safe reference (a UUID that never changes across retries). */
export type NewMaterialRequestWithRef = Schemas["NewMaterialRequest"] & { clientRef?: string };

export type AddMaterialsRequestWithRefs = { items: NewMaterialRequestWithRef[] };

/** The week with its opaque version: "0" when the week isn't reported. */
export type LabourWeekWithVersion = Schemas["LabourWeekResponse"] & { version: string };

/** A submission that fails with 409 `labour_week_changed` when someone else changed the week meanwhile. */
export type SubmitLabourWeekRequestWithVersion = Schemas["SubmitLabourWeekRequest"] & {
  expectedVersion?: string;
};

// ---------- push ----------

export type PushTarget =
  | {
      type: "project";
      id: number;
      domain: "design" | "execution";
      section?: "requirements" | "meetings" | "materials" | "labour";
    }
  | {
      type: "requirement";
      projectId: number;
      requirementId: number;
      domain: "design" | "execution";
    }
  | { type: "work_entry"; id: number }
  | { type: "conversation"; teamId?: number; userId?: number }
  | { type: "labour_week"; projectId: number; weekStart: string }
  | { type: "person"; id: number }
  | { type: "client"; id: number }
  | { type: "invoice"; id: number }
  | { type: "payment"; id: number }
  | { type: "statement"; id: number }
  | { type: "page"; page: "notifications" | "today" | "work" | "meetings" | "company" };

export type PushData = {
  /** The app ignores a push for anyone other than the signed-in person. */
  forUserId: number;
  /** A notification kind, or "message", "log_reminder", "labour_week_reminder". */
  kind: string;
  /** Set for notification pushes. */
  notificationId?: number;
  target: PushTarget;
};

/** The Android channels the app creates; the server sends each push on one of them. */
export type AndroidChannel = NotificationCategory | "reminders" | "timer" | "quiet";
