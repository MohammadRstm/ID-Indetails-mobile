import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { Pressable, Text } from "react-native";
import { api } from "@test/handlers";
import { invoice, payment } from "@test/billing";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { tokenManager } from "@/auth/tokenManager";
import { paymentErrors, paymentRequest, type PaymentDraft } from "./model";
import { RecordPaymentScreen } from "./screens/RecordPaymentScreen";
import { useShareDocument } from "./useShareDocument";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  router: { back: (...a: unknown[]) => mockBack(...a), push: jest.fn(), canGoBack: () => true },
}));

const mockDownload = jest.fn();
const mockShare = jest.fn();
jest.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(...parts: ({ uri?: string } | string)[]) {
      this.uri = `file:///cache/${parts.map((p) => (typeof p === "string" ? p : (p.uri ?? ""))).join("/")}`;
    }
    static downloadFileAsync = (...a: unknown[]) => mockDownload(...a);
  }
  class Directory {
    uri = "file:///cache/documents";
    create() {}
  }
  return { File, Directory, Paths: { cache: "cache" } };
});
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: (...a: unknown[]) => mockShare(...a),
}));

const draft: PaymentDraft = {
  projectId: 21,
  invoiceId: 1,
  amount: 100,
  currency: "USD",
  fxRate: null,
  receivedOn: "2026-10-08",
  method: "bank",
  reference: "",
  note: "",
};

describe("payment form rules", () => {
  it("accepts a complete payment", () => {
    expect(paymentErrors(draft, "2026-10-08")).toEqual({});
  });

  it("asks for what is missing, and refuses a day in the future", () => {
    const errors = paymentErrors(
      { ...draft, projectId: null, amount: null, receivedOn: "2026-11-01" },
      "2026-10-08",
    );
    expect(Object.keys(errors).sort()).toEqual(["amount", "projectId", "receivedOn"]);
  });

  it("sends no rate with US dollars", () => {
    expect(paymentRequest({ ...draft, fxRate: 90000 }).fxRate).toBeNull();
    expect(paymentRequest({ ...draft, currency: "LBP", fxRate: 90000 }).fxRate).toBe(90000);
  });
});

describe("RecordPaymentScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    server.use(http.get(api("/invoices/1"), () => HttpResponse.json(invoice())));
  });

  it("records a payment against the invoice after a review", async () => {
    let body: unknown;
    server.use(
      http.post(api("/projects/21/payments"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(payment());
      }),
    );
    await renderWithProviders(<RecordPaymentScreen invoiceId={1} />, { persona: "superAdmin" });

    fireEvent.press(await screen.findByText("Review"));
    fireEvent.press(await screen.findByText("Record payment"));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(body).toMatchObject({ invoiceId: 1, amount: 1000, currency: "USD", method: "bank" });
  });

  it("stops at the form while the amount is missing", async () => {
    await renderWithProviders(<RecordPaymentScreen invoiceId={1} />, { persona: "superAdmin" });
    // Switching currency clears the amount, which the invoice's balance had filled in.
    fireEvent.press(await screen.findByText("LBP"));
    fireEvent.press(await screen.findByText("Review"));
    expect(await screen.findByText("Enter the amount received.")).toBeTruthy();
    expect(screen.queryByText("Record payment")).toBeNull();
  });

  it("shows what the API refused next to the field", async () => {
    server.use(
      http.post(api("/projects/21/payments"), () =>
        HttpResponse.json(
          {
            type: "validation",
            code: "validation_failed",
            message: "Check the form.",
            errors: { amount: ["More than is left on the invoice."] },
          },
          { status: 422 },
        ),
      ),
    );
    await renderWithProviders(<RecordPaymentScreen invoiceId={1} />, { persona: "superAdmin" });
    fireEvent.press(await screen.findByText("Review"));
    fireEvent.press(await screen.findByText("Record payment"));
    expect(await screen.findByText("More than is left on the invoice.")).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

function ShareProbe({ askHowSent }: { askHowSent: boolean }) {
  const { share, asking } = useShareDocument({
    path: "/invoices/1/pdf",
    fileName: "hl-2026-014.pdf",
    title: "HL-2026-014",
    askHowSent,
  });
  return (
    <>
      <Pressable onPress={() => void share()}>
        <Text>share</Text>
      </Pressable>
      <Text>{asking ? "asking" : "quiet"}</Text>
    </>
  );
}

describe("sharing a PDF", () => {
  beforeEach(() => {
    jest.spyOn(tokenManager, "getAccessToken").mockReturnValue("access-1");
    mockDownload.mockReset().mockResolvedValue(undefined);
    mockShare.mockReset().mockResolvedValue(undefined);
  });

  it("downloads with the bearer token, opens the share sheet, then asks how it was sent", async () => {
    await renderWithProviders(<ShareProbe askHowSent />);
    await act(async () => fireEvent.press(await screen.findByText("share")));

    await waitFor(() => expect(screen.getByText("asking")).toBeTruthy());
    const [url, , options] = mockDownload.mock.calls[0] as [string, unknown, { headers: object }];
    expect(url).toBe("http://api.test/api/invoices/1/pdf");
    expect(options.headers).toMatchObject({ Authorization: "Bearer access-1" });
    expect(mockShare).toHaveBeenCalledWith(
      expect.stringContaining("hl-2026-014.pdf"),
      expect.objectContaining({ mimeType: "application/pdf" }),
    );
  });

  it("does not ask someone who may not record a delivery", async () => {
    await renderWithProviders(<ShareProbe askHowSent={false} />);
    await act(async () => fireEvent.press(await screen.findByText("share")));
    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(screen.getByText("quiet")).toBeTruthy();
  });

  it("does not share or ask when the download fails", async () => {
    mockDownload.mockRejectedValue(new Error("response has status: 500"));
    await renderWithProviders(<ShareProbe askHowSent />);
    await act(async () => fireEvent.press(await screen.findByText("share")));
    await waitFor(() => expect(mockDownload).toHaveBeenCalled());
    expect(mockShare).not.toHaveBeenCalled();
    expect(screen.getByText("quiet")).toBeTruthy();
  });
});
