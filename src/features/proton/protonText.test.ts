import { blocksOf, plainText } from "./protonText";

// The answer from the web's bug report: bold labels in a list, under bold headings
const SUMMARY = [
  "Here's the company for the first 19 days of October, against the same 19 days of September.",
  "",
  "**Design**",
  "- **Projects:** 7 active, 2 on hold, 1 completed.",
  "- **Hours:** 155.5 h logged, down from 821.8 h (−81%).",
  "  The biggest drop was Mira & Partners office fit-out.",
  "",
  "**Execution**",
  "- **Money:** 33,500 USD received (up from 10,000 USD).",
  "- Execution doesn't log hours, so there's no hours figure for it.",
].join("\n");

describe("Proton's answers read from their markdown", () => {
  it("reads paragraphs, lists, headings and an indented line that carries on a list item", () => {
    expect(blocksOf(SUMMARY)).toEqual([
      {
        kind: "p",
        lines: [
          "Here's the company for the first 19 days of October, against the same 19 days of September.",
        ],
      },
      { kind: "p", lines: ["**Design**"] },
      {
        kind: "ul",
        items: [
          { text: "**Projects:** 7 active, 2 on hold, 1 completed.", sub: [] },
          {
            text: "**Hours:** 155.5 h logged, down from 821.8 h (−81%). The biggest drop was Mira & Partners office fit-out.",
            sub: [],
          },
        ],
      },
      { kind: "p", lines: ["**Execution**"] },
      {
        kind: "ul",
        items: [
          { text: "**Money:** 33,500 USD received (up from 10,000 USD).", sub: [] },
          { text: "Execution doesn't log hours, so there's no hours figure for it.", sub: [] },
        ],
      },
    ]);
    expect(
      blocksOf("## Next steps\n1. Call Acme\n2. Send the invoice\n\n3. Close it\n   - by Friday"),
    ).toEqual([
      { kind: "h", text: "Next steps" },
      {
        kind: "ol",
        start: 1,
        items: [
          { text: "Call Acme", sub: [] },
          { text: "Send the invoice", sub: [] },
          { text: "Close it", sub: ["by Friday"] },
        ],
      },
    ]);
  });

  it("gives the same answer as plain text for the preview and the voice", () => {
    expect(plainText(SUMMARY)).toBe(
      [
        "Here's the company for the first 19 days of October, against the same 19 days of September.",
        "",
        "Design",
        "Projects: 7 active, 2 on hold, 1 completed.",
        "Hours: 155.5 h logged, down from 821.8 h (−81%).",
        "  The biggest drop was Mira & Partners office fit-out.",
        "",
        "Execution",
        "Money: 33,500 USD received (up from 10,000 USD).",
        "Execution doesn't log hours, so there's no hours figure for it.",
      ].join("\n"),
    );
    expect(plainText("## Done\n---\n**Bold *and italic***")).toBe("Done\nBold and italic");
  });
});
