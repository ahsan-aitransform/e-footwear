// Timing rules of the browser-side session handling.

// A tab that regains focus re-validates the session with the server, but not more often than this.
export const SESSION_REVERIFICATION_MINIMUM_INTERVAL_MILLISECONDS = 60_000;
