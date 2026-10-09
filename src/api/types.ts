import type { components } from "./schema";

/** Every request and response shape of the API, generated from its OpenAPI document. */
export type Schemas = components["schemas"];

/** The API's paged list: `{ items, page, pageSize, totalCount }`. */
export type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number };

// Named aliases for the shapes the app passes around. Anything else: Schemas["…Response"].

export type CurrentUser = Schemas["CurrentUserResponse"];
export type CompanySettings = Schemas["CompanySettingsResponse"];
export type FileInfo = Schemas["FileResponse"];
export type PersonRef = Schemas["PersonRefResponse"];

export type ProjectStatus = Schemas["ProjectStatus"];
export type ProjectSummary = Schemas["ProjectSummaryResponse"];
export type Project = Schemas["ProjectResponse"];
export type Requirement = Schemas["RequirementResponse"];
export type MyRequirements = Schemas["MyRequirementsResponse"];
export type Meeting = Schemas["MeetingResponse"];

export type WorkEntry = Schemas["WorkEntryResponse"];
export type WorkEntryDetail = Schemas["WorkEntryDetailResponse"];
export type MyDay = Schemas["MyDayResponse"];
export type MySchedule = Schemas["MyScheduleResponse"];
export type WorkSummary = Schemas["WorkSummaryResponse"];
export type OvertimePreview = Schemas["OvertimePreviewResponse"];

export type SiteSummary = Schemas["SiteSummaryResponse"];
export type Material = Schemas["MaterialResponse"];
export type MaterialList = Schemas["MaterialListResponse"];
export type LabourWeekSummary = Schemas["LabourWeekSummaryResponse"];

export type Notification = Schemas["NotificationResponse"];
export type UnreadCount = Schemas["UnreadCountResponse"];
export type Conversation = Schemas["ConversationResponse"];
export type Message = Schemas["MessageResponse"];
export type MessagePage = Schemas["MessagePageResponse"];
export type MessagesBadge = Schemas["MessagesBadgeResponse"];

export type Employee = Schemas["EmployeeResponse"];
export type EmployeeSummary = Schemas["EmployeeSummaryResponse"];
export type Client = Schemas["ClientResponse"];
export type ClientSummary = Schemas["ClientSummaryResponse"];
export type ActivityItem = Schemas["ActivityItemResponse"];

export type Invoice = Schemas["InvoiceResponse"];
export type InvoiceSummary = Schemas["InvoiceSummaryResponse"];
export type Payment = Schemas["PaymentResponse"];
export type Statement = Schemas["StatementResponse"];

export type ProtonReply = Schemas["ProtonReplyResponse"];
export type ProtonUiCommand = Schemas["ProtonUiCommand"];

// The phone's own shapes, hand-written until they are generated (mobileTypes.ts).
export type {
  AndroidChannel,
  DevicePlatform,
  DeviceResponse as Device,
  LabourWeekWithVersion as LabourWeek,
  MobileAuthResponse,
  NotificationCategory,
  NotificationSettingsResponse as NotificationSettings,
  PushData,
  PushTarget,
} from "./mobileTypes";
