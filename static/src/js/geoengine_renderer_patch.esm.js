/** @odoo-module */
/**
 * Patch the GeoengineRenderer to ensure OpenLayers is fully loaded
 * before rendering the map. The OCA base_geoengine module loads ol.js
 * via loadBundle() in onWillStart, but the script may not be fully
 * parsed/executed by the time onMounted fires.
 *
 * Both renderMap() and renderVectorLayers() are called from onMounted
 * and both use the global `ol` object extensively. We guard both entry
 * points so that all downstream methods (createOverlay, createVectorLayer,
 * setupControls, registerInteraction, etc.) only run once ol is available.
 */
import {GeoengineRenderer} from "@base_geoengine/js/views/geoengine/geoengine_renderer/geoengine_renderer.esm";
import {patch} from "@web/core/utils/patch";

let olReadyPromise = null;

function normalizeError(error, fallbackMessage) {
    if (error instanceof Error) {
        return error;
    }
    if (typeof error === "string" && error.trim()) {
        return new Error(error);
    }
    return new Error(fallbackMessage);
}

/**
 * Returns a promise that resolves once the global `ol` object is defined.
 * Polls every 50ms, up to 10 seconds (200 attempts).
 */
function waitForOl() {
    if (olReadyPromise) {
        return olReadyPromise;
    }

    olReadyPromise = new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            if (typeof ol !== "undefined") {
                resolve();
            } else if (attempts++ > 200) {
                reject(new Error("OpenLayers (ol) failed to load after 10s"));
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    }).catch((error) => {
        olReadyPromise = null;
        throw normalizeError(
            error,
            "OpenLayers (ol) failed to load (unknown error)"
        );
    });

    return olReadyPromise;
}

/**
 * Custom color mapping for camping.place actual_state field.
 * Libre = vert, location = jaune, reservation = orange, etc.
 * Rouge est réservé pour signaler un problème.
 */
const STATE_COLORS = {
    "libre": "#4CAF50",        // vert — place disponible
    "location": "#FFC107",     // jaune — place louée
    "reservation": "#FF9800",  // orange — place réservée
    "loc_caravane": "#2196F3", // bleu — caravane en location
    "loc_mobilhome": "#9C27B0",// violet — mobilhome en location
};
const DEFAULT_LIBRE_COLOR = "#4CAF50"; // vert pour "Libre", "libre dès le..."
const LEGEND_MAX_ITEMS = 10;

function getStateColor(value, opacity) {
    const lower = (value || "").toLowerCase();
    const hex = STATE_COLORS[lower] || (lower.startsWith("libre") ? DEFAULT_LIBRE_COLOR : "#9E9E9E");
    return typeof chroma !== "undefined" ? chroma(hex).alpha(opacity).css() : hex;
}

patch(GeoengineRenderer.prototype, {
    styleVectorLayerColored(cfg, data) {
        // Only override for actual_state attribute — delegate everything else
        if (!cfg.attribute_field_id || cfg.attribute_field_id[1] !== "actual_state") {
            return super.styleVectorLayerColored(cfg, data);
        }

        const indicator = cfg.attribute_field_id[1];
        const values = this.extractLayerValues(cfg, data);
        const opacity = cfg.layer_opacity;
        const serie = new geostats(values);
        const vals = serie.getClassUniqueValues();

        // Build color array matching unique values order
        const colors = vals.map((val) => getStateColor(val, opacity));

        // Create OpenLayers styles from colors
        const styles_map = this.createStylesWithColors(colors);

        // Generate legend
        let legend = null;
        if (vals.length <= LEGEND_MAX_ITEMS) {
            legend = serie.getHtmlLegend(colors, cfg.name, 1);
        }

        return {
            style: (feature) => {
                const value = feature.get("attributes")[indicator];
                const color_idx = this.getClass(value, vals);
                let label_text = feature.values_.attributes.label;
                if (label_text === false) {
                    label_text = "";
                }
                if (color_idx !== undefined && colors[color_idx] && styles_map[colors[color_idx]]) {
                    styles_map[colors[color_idx]][0].text_.text_ = label_text.toString();
                    return styles_map[colors[color_idx]];
                }
                // Fallback: grey
                const fallback = getStateColor("", opacity);
                if (!styles_map[fallback]) {
                    const extra = this.createStylesWithColors([fallback]);
                    Object.assign(styles_map, extra);
                }
                styles_map[fallback][0].text_.text_ = label_text.toString();
                return styles_map[fallback];
            },
            legend,
        };
    },
    async renderMap() {
        try {
            if (typeof ol === "undefined") {
                await waitForOl();
            }
            return await super.renderMap(...arguments);
        } catch (error) {
            console.error(
                "base_geoengine_camping: renderMap aborted:",
                normalizeError(error, "renderMap failed")
            );
            return;
        }
    },
    async renderVectorLayers() {
        try {
            if (typeof ol === "undefined") {
                await waitForOl();
            }
            return await super.renderVectorLayers(...arguments);
        } catch (error) {
            console.error(
                "base_geoengine_camping: renderVectorLayers aborted:",
                normalizeError(error, "renderVectorLayers failed")
            );
            return;
        }
    },
    onDisplayPopupRecord(record) {
        if (!this.vectorSource) {
            // Vector layers not yet rendered — retry after a short delay
            setTimeout(() => this.onDisplayPopupRecord(record), 200);
            return;
        }
        super.onDisplayPopupRecord(...arguments);
    },
});
