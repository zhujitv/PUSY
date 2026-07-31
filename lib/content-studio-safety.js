const contentSubmitIntents = new Set(["draft", "schedule", "publish"]);

/** @typedef {"draft" | "schedule" | "publish"} ContentSubmitIntent */

/**
 * Only an explicitly activated save control may choose a content release action.
 * @param {unknown} value
 * @returns {ContentSubmitIntent | null}
 */
export function resolveContentSubmitIntent(value) {
  return typeof value === "string" && contentSubmitIntents.has(value) ? /** @type {ContentSubmitIntent} */ (value) : null;
}

/**
 * Loading or publishing another revision replaces the current editor state.
 * @param {boolean} dirty
 * @param {"load" | "publish"} operation
 */
export function needsContentDiscardWarning(dirty, operation) {
  return dirty && (operation === "load" || operation === "publish");
}
