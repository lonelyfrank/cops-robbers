/**
 * Public surface of the district geometry.
 *
 * The rest of the code builds a district through `buildDistrictGeometry()` and never has
 * to know which module draws a roof, a kerb or a signal head.
 */
export { buildDistrictGeometry } from './createDistrict.js';
export { getDistrictStyle } from './districtVariants.js';
export { SIGNAL_COLORS } from './trafficLights.js';
