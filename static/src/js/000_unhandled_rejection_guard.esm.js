/** @odoo-module */

const GUARD_FLAG = "__base_geoengine_camping_unhandled_rejection_guard__";

function toError(reason) {
    if (reason instanceof Error) {
        return reason;
    }
    if (typeof reason === "string" && reason.trim()) {
        return new Error(reason);
    }
    return new Error("Unhandled promise rejection without Error payload");
}

if (!window[GUARD_FLAG]) {
    window[GUARD_FLAG] = true;

    // Capture phase to run before Odoo's global unhandled rejection handler.
    window.addEventListener(
        "unhandledrejection",
        (event) => {
            const reason = event?.reason;
            const hasStack =
                reason &&
                typeof reason === "object" &&
                typeof reason.stack === "string";

            if (hasStack) {
                return;
            }

            const normalizedError = toError(reason);
            console.error(
                "base_geoengine_camping: normalized invalid unhandled rejection reason",
                {
                    originalReason: reason,
                    normalizedError,
                }
            );

            // Prevent Odoo's formatter from crashing on `error.stack.split`.
            event.preventDefault();
            event.stopImmediatePropagation();
        },
        true
    );
}
