/*
 * Server-sent events, as Proton's stream sends them (ported from the web's protonStream.ts): "event:" and
 * "data:" lines, a blank line after each event, and ": ping" comments every few seconds to keep the line open.
 */

export type SseEvent = { name: string; data: string };

/**
 * The complete events in `buffer`, and what is left of it (an event cut off mid-way). Comments (": ping") and
 * events without data are skipped.
 */
export function parseSse(buffer: string): { events: SseEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: SseEvent[] = [];
  for (const block of blocks) {
    let name = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length > 0) events.push({ name, data: data.join("\n") });
  }
  return { events, rest };
}

/** The answer as it has been written so far: the model call (`trip`) it comes from, and its text. */
export type LiveText = { trip: number; text: string };

/** Adds a piece of the answer. A later model call's text replaces an earlier one's (text before a tool call is often superseded). */
export function addDelta(live: LiveText | null, trip: number, text: string): LiveText {
  return live?.trip === trip ? { trip, text: live.text + text } : { trip, text };
}
