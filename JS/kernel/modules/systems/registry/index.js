/**
 * Agregador dos 155 micro-sistemas do VessieOS, por categoria:
 *
 *   visual (18) · performance (16) · ux (16) · accessibility (15) ·
 *   security (15) · productivity (16) · gamehub (15) · ai (14) ·
 *   network (15) · diagnostics (15)
 *
 * = 155 sistemas no total.
 */
import buildVisualSystems from './visual.js';
import buildPerformanceSystems from './performance.js';
import buildUXSystems from './ux.js';
import buildAccessibilitySystems from './accessibility.js';
import buildSecuritySystems from './security.js';
import buildProductivitySystems from './productivity.js';
import buildGameHubSystems from './gamehub.js';
import buildAISystems from './ai.js';
import buildNetworkSystems from './network.js';
import buildDiagnosticsSystems from './diagnostics.js';

export const EXPECTED_TOTAL = 155;

const builders = [
    buildVisualSystems,
    buildPerformanceSystems,
    buildUXSystems,
    buildAccessibilitySystems,
    buildSecuritySystems,
    buildProductivitySystems,
    buildGameHubSystems,
    buildAISystems,
    buildNetworkSystems,
    buildDiagnosticsSystems
];

/**
 * Constrói a lista completa de descritores de sistemas.
 * @param {object} ctx - contexto injetado pelo SystemsRuntime (helpers + managers do kernel)
 */
export function buildRegistry(ctx) {
    const all = [];
    for (const build of builders) {
        try {
            const list = build(ctx) || [];
            all.push(...list);
        } catch (e) {
            console.error('[SystemsRegistry] Uma categoria falhou ao construir:', e);
        }
    }
    return all;
}
