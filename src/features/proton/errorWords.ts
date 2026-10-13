import type { ApiError } from "@/api/errors";

/*
 * Proton's own refusals, in short plain sentences. They are said the same way whatever the API's wording, and the
 * phone branches on the code, never on the message. Any other failure keeps the API's message.
 */
const WORDS: Record<string, string> = {
  proton_phrase_mismatch: "That isn't the phrase on the card. Type it exactly as shown.",
  proton_action_limit:
    "That's all the changes I can make for you for now. Try again later, or make it in the app.",
  proton_too_many_pending: "Some changes are already waiting. Confirm or cancel one first.",
  proton_actions_off: "I can't make this kind of change right now. You can make it in the app.",
  proton_action_not_pending: "This proposal is already closed. Ask me again if you still want it.",
  proton_choice_invalid: "That option isn't available any more. Could you ask me again?",
  proton_memory_refused:
    "I can't remember that. I only keep short preferences you wrote to me in a chat.",
};

/** The sentence to show for a failed Proton request. */
export function protonErrorText(error: ApiError): string {
  return Object.hasOwn(WORDS, error.code) ? WORDS[error.code] : error.message;
}
