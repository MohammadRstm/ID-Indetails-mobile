import { ApiError } from "@/api/errors";
import { protonErrorText, rememberErrorText } from "./errorWords";

const failure = (code: string, message = "The API's own words.") =>
  new ApiError(422, { code, message });

describe("protonErrorText", () => {
  it.each([
    ["proton_phrase_mismatch", "That isn't the phrase on the card. Type it exactly as shown."],
    [
      "proton_action_limit",
      "That's all the changes I can make for you for now. Try again later, or make it in the app.",
    ],
    ["proton_too_many_pending", "Some changes are already waiting. Confirm or cancel one first."],
    [
      "proton_actions_off",
      "I can't make this kind of change right now. You can make it in the app.",
    ],
    [
      "proton_action_not_pending",
      "This proposal is already closed. Ask me again if you still want it.",
    ],
    ["proton_choice_invalid", "That option isn't available any more. Could you ask me again?"],
    [
      "proton_memory_refused",
      "I can't remember that. I only keep short preferences you wrote to me in a chat.",
    ],
  ])("says %s in plain words", (code, words) => {
    expect(protonErrorText(failure(code))).toBe(words);
  });

  it("keeps the API's message for any other failure", () => {
    expect(protonErrorText(failure("proton_busy", "Still answering."))).toBe("Still answering.");
    expect(protonErrorText(failure("toString"))).toBe("The API's own words.");
  });
});

describe("rememberErrorText", () => {
  it("shows why the API refused to remember something", () => {
    const refused = failure("proton_memory_refused", "That reads like an instruction to act.");
    expect(rememberErrorText(refused)).toBe("That reads like an instruction to act.");
  });

  it("says any other failure as Proton does", () => {
    expect(rememberErrorText(failure("proton_busy", "Still answering."))).toBe("Still answering.");
  });
});
