import type { CompanyOverview, DomainOverview } from "@/features/company/model";
import type { Employee, Invoice, Notification, Payment, Project } from "@/api/types";

/** Billing and company records the API would answer, for tests. Amounts are plain numbers, as the API sends them. */

export function invoice(change: Partial<Invoice> = {}): Invoice {
  return {
    id: 1,
    number: "HL-2026-014",
    status: "sent",
    domain: "design",
    currency: "USD",
    total: 1200,
    paid: 200,
    balance: 1000,
    isOverdue: false,
    issuedAt: "2026-09-01T09:00:00Z",
    dueOn: "2026-10-01",
    sendOn: null,
    sendTo: null,
    termsDays: 30,
    notes: null,
    billToName: null,
    billToContact: null,
    client: { id: 7, displayName: "Habib Holdings" },
    project: { id: 21, title: "Habib Villa", location: null },
    lines: [],
    deliveries: [],
    createdAt: "2026-08-28T09:00:00Z",
    createdBy: null,
    scheduledBy: null,
    voidedAt: null,
    voidReason: null,
    ...change,
  };
}

export function payment(change: Partial<Payment> = {}): Payment {
  return {
    id: 90,
    amount: 1000,
    amountUsd: 1000,
    currency: "USD",
    fxRate: 1,
    domain: "design",
    client: { id: 7, displayName: "Habib Holdings" },
    project: { id: 21, title: "Habib Villa", location: null },
    invoiceId: 1,
    invoiceNumber: "HL-2026-014",
    isInitial: false,
    method: "bank",
    note: null,
    reference: null,
    receivedOn: "2026-10-08",
    recordedAt: "2026-10-08T09:00:00Z",
    voidedAt: null,
    voidReason: null,
    ...change,
  };
}

function domainOverview(domain: string, change: Partial<DomainOverview> = {}): DomainOverview {
  return {
    domain,
    revenue: 5000,
    cost: 3000,
    profit: 2000,
    margin: 0.4,
    invoiced: 6000,
    collected: 5000,
    outstanding: 1000,
    activeProjects: 4,
    projectsWithActivity: 3,
    clientsServed: 2,
    allClients: 5,
    people: 6,
    loggers: 5,
    tracksHours: domain === "design",
    unconvertedCosts: [],
    unconvertedInvoices: [],
    ...change,
  };
}

export function companyOverview(): CompanyOverview {
  return {
    from: "2026-10-01",
    to: "2026-10-08",
    revenue: 10000,
    cost: 6000,
    grossProfit: 4000,
    overhead: 500,
    adminSalaries: 700,
    netProfit: 2800,
    invoiced: 12000,
    collected: 10000,
    outstanding: 2000,
    clientsServed: 4,
    projectsWithActivity: 6,
    domains: [domainOverview("design"), domainOverview("execution")],
    unconvertedAdminSalaries: [],
    unconvertedInvoices: [],
    unconvertedOverhead: [],
  };
}

export function employee(change: Partial<Employee> = {}): Employee {
  return {
    id: 12,
    email: "lina@hourline.test",
    firstName: "Lina",
    lastName: "Test",
    role: "employee",
    domain: "design",
    team: null,
    position: null,
    phone: null,
    joinedOn: "2025-09-01",
    leftOn: null,
    photoFileId: null,
    isJoker: false,
    online: false,
    lastSeenAt: null,
    sessionsRevokedAt: null,
    status: "active",
    currentPay: null,
    createdAt: "2025-09-01T09:00:00Z",
    ...change,
  };
}

/** Only the money of a project: what the slot reads. */
export function projectWithMoney(money: Project["money"]): Project {
  return { id: 21, title: "Habib Villa", money } as Project;
}

export function failedSendNotification(id: number): Notification {
  return {
    id,
    kind: "invoice_send_failed",
    readAt: null,
    createdAt: "2026-10-08T07:00:00Z",
    subjectId: 1,
    payload: {},
    project: null,
  } as unknown as Notification;
}
