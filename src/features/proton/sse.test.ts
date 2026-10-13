import { addDelta, parseSse } from "./sse";

describe("parseSse", () => {
  it("reads complete events and keeps an unfinished one as the rest", () => {
    const text =
      'event: status\ndata: {"text":"Reading the project"}\n\n' +
      'event: delta\ndata: {"trip":1,"text":"Hel"}\n\n' +
      'event: delta\ndata: {"trip":1,"te';
    const { events, rest } = parseSse(text);
    expect(events).toEqual([
      { name: "status", data: '{"text":"Reading the project"}' },
      { name: "delta", data: '{"trip":1,"text":"Hel"}' },
    ]);
    expect(rest).toBe('event: delta\ndata: {"trip":1,"te');
  });

  it("finishes an event once the rest of it arrives", () => {
    const first = parseSse('event: done\ndata: {"reply":"Hi"');
    expect(first.events).toEqual([]);
    const second = parseSse(`${first.rest}}\n\n`);
    expect(second.events).toEqual([{ name: "done", data: '{"reply":"Hi"}' }]);
    expect(second.rest).toBe("");
  });

  it("skips ping comments and events without data", () => {
    const { events } = parseSse(": ping\n\nevent: empty\n\nevent: done\ndata: {}\n\n");
    expect(events).toEqual([{ name: "done", data: "{}" }]);
  });

  it("reads CRLF line endings and joins the lines of one event's data", () => {
    const { events } = parseSse("event: delta\r\ndata: one\r\ndata: two\r\n\r\n");
    expect(events).toEqual([{ name: "delta", data: "one\ntwo" }]);
  });

  it("calls an event with no name a message", () => {
    expect(parseSse("data: {}\n\n").events).toEqual([{ name: "message", data: "{}" }]);
  });
});

describe("addDelta", () => {
  it("grows the text of one model call", () => {
    const first = addDelta(null, 1, "Villa ");
    expect(addDelta(first, 1, "Haddad")).toEqual({ trip: 1, text: "Villa Haddad" });
  });

  it("lets a later model call replace the text of an earlier one", () => {
    const first = addDelta(null, 1, "Let me look.");
    expect(addDelta(first, 2, "It is on track.")).toEqual({ trip: 2, text: "It is on track." });
  });
});
