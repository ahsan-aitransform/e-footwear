import type { englishMessages } from "./messages/en";

// The set of message keys is the set of keys of the English catalogue. Every other language must provide all of them.
export type MessageKey = keyof typeof englishMessages;
