import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { http } from "@/api/http";
import type {
  Client,
  Invoice,
  InvoiceSummary,
  Paged,
  Payment,
  ProjectSummary,
  Schemas,
  Statement,
} from "@/api/types";
import type { DeliveryChannel } from "./model";

/*
 * Invoices, payments and statements: one hook per endpoint (docs/investigation.md, the API's docs/billing.md and
 * docs/documents.md). Every amount is the API's; the app only shows it.
 */

/** Which invoices the list shows; the API sorts them newest first. */
export type InvoiceFilter = "all" | "overdue" | "sent" | "draft";

const FILTER_PARAMS: Record<InvoiceFilter, Record<string, string | boolean>> = {
  all: {},
  overdue: { overdue: true },
  sent: { status: "sent" },
  draft: { status: "draft" },
};

const PAGE_SIZE = 25;

export const billingKeys = {
  invoices: ["invoices"] as const,
  invoiceList: (filter: InvoiceFilter) => ["invoices", "list", filter] as const,
  invoiceCount: (filter: InvoiceFilter) => ["invoices", "count", filter] as const,
  invoice: (id: number) => ["invoices", "detail", id] as const,
  projectInvoices: (projectId: number) => ["invoices", "project", projectId] as const,
  payments: ["payments"] as const,
  statement: (id: number) => ["statements", "detail", id] as const,
  client: (id: number) => ["billing", "client", id] as const,
  payableProjects: ["billing", "payable-projects"] as const,
};

/**
 * Everything an invoice, payment or statement change can move: the billing lists, the domains' and the
 * company's figures, and the projects (their money). Projects are another feature's queries; their keys all
 * start with "projects".
 */
const BILLING_AFFECTS: QueryKey[] = [
  billingKeys.invoices,
  billingKeys.payments,
  ["statements"],
  ["finance"],
  ["company", "overview"],
  ["projects"],
  billingKeys.payableProjects,
];

function useRefreshBilling() {
  const queryClient = useQueryClient();
  return () => {
    BILLING_AFFECTS.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
  };
}

export function useInvoiceList(filter: InvoiceFilter) {
  return useInfiniteQuery({
    queryKey: billingKeys.invoiceList(filter),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await http.get<Paged<InvoiceSummary>>("/invoices", {
          params: { ...FILTER_PARAMS[filter], page: pageParam, pageSize: PAGE_SIZE },
        })
      ).data,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
  });
}

/** How many invoices match, without loading them. */
export function useInvoiceCount(filter: InvoiceFilter, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoiceCount(filter),
    enabled,
    queryFn: async () =>
      (
        await http.get<Paged<InvoiceSummary>>("/invoices", {
          params: { ...FILTER_PARAMS[filter], page: 1, pageSize: 1 },
        })
      ).data.totalCount,
  });
}

export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: billingKeys.invoice(id ?? 0),
    enabled: id != null,
    queryFn: async () => (await http.get<Invoice>(`/invoices/${id}`)).data,
  });
}

/** An invoice write answers with the invoice: the screen shows it at once, and the lists reload. */
function useInvoiceMutation<Body>(id: number, send: (body: Body) => Promise<Invoice>) {
  const queryClient = useQueryClient();
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: send,
    onSuccess: (invoice) => {
      queryClient.setQueryData(billingKeys.invoice(id), invoice);
      refresh();
    },
  });
}

/** Numbers a draft and starts its payment clock (invoice:send). */
export function useIssueInvoice(id: number) {
  return useInvoiceMutation<void>(
    id,
    async () => (await http.post<Invoice>(`/invoices/${id}/issue`, {})).data,
  );
}

/** The server emails the issued invoice with its PDF and records the delivery (invoice:send). */
export function useEmailInvoice(id: number) {
  return useInvoiceMutation<Schemas["EmailDocumentRequest"]>(
    id,
    async (body) => (await http.post<Invoice>(`/invoices/${id}/email`, body)).data,
  );
}

/** Records a send made outside the app's email: a WhatsApp share or a PDF saved or shared (invoice:send). */
export function useRecordInvoiceDelivery(id: number) {
  return useInvoiceMutation<{ channel: DeliveryChannel; recipient?: string | null }>(
    id,
    async (body) => (await http.post<Invoice>(`/invoices/${id}/deliveries`, body)).data,
  );
}

/** A client's contacts, for the address an email is prefilled with. */
export function useClientContacts(clientId: number | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.client(clientId ?? 0),
    enabled: enabled && clientId != null,
    queryFn: async () => (await http.get<Client>(`/clients/${clientId}`)).data,
    select: (client) => client.contacts,
  });
}

/** Client projects that take payments, for recording one without an invoice. */
export function usePayableProjects(enabled = true) {
  return useQuery({
    queryKey: billingKeys.payableProjects,
    enabled,
    queryFn: async () =>
      (
        await http.get<Paged<ProjectSummary>>("/projects", {
          params: { billingType: "client", sort: "activity", pageSize: 100 },
        })
      ).data.items.filter((project) => project.client != null),
  });
}

/** A project's invoices, to pick the one a payment pays. */
export function useProjectInvoices(projectId: number | null) {
  return useQuery({
    queryKey: billingKeys.projectInvoices(projectId ?? 0),
    enabled: projectId != null,
    queryFn: async () =>
      (
        await http.get<Paged<InvoiceSummary>>("/invoices", {
          params: { projectId, pageSize: 100 },
        })
      ).data.items,
  });
}

/** Money a client sent, against an invoice or on account (payment:record). */
export function useRecordPayment(projectId: number) {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: async (body: Schemas["RecordPaymentRequest"]) =>
      (await http.post<Payment>(`/projects/${projectId}/payments`, body)).data,
    onSuccess: refresh,
  });
}

export function useStatement(id: number) {
  return useQuery({
    queryKey: billingKeys.statement(id),
    queryFn: async () => (await http.get<Statement>(`/statements/${id}`)).data,
  });
}

function useStatementMutation<Body>(id: number, send: (body: Body) => Promise<Statement>) {
  const queryClient = useQueryClient();
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: send,
    onSuccess: (statement) => {
      queryClient.setQueryData(billingKeys.statement(id), statement);
      refresh();
    },
  });
}

/** The server emails the statement with its PDF and records the delivery (statement:send). */
export function useEmailStatement(id: number) {
  return useStatementMutation<Schemas["EmailDocumentRequest"]>(
    id,
    async (body) => (await http.post<Statement>(`/statements/${id}/email`, body)).data,
  );
}

/** Records a statement sent outside the app's email (statement:send). Sending it makes its materials revenue. */
export function useRecordStatementDelivery(id: number) {
  return useStatementMutation<{ channel: DeliveryChannel; recipient?: string | null }>(
    id,
    async (body) => (await http.post<Statement>(`/statements/${id}/deliveries`, body)).data,
  );
}
