import * as THREE from 'three';
import { VoxelBatch } from '../../rendering/voxelModels.js';
import { IntersectionTraffic } from '../TrafficController.js';
import { MAIN_ROAD_Z } from '../mapLayout.js';
import { getCityTheme, DEFAULT_CITY_THEME } from '../themes/index.js';
import { neonStreetDetails } from './neonDistrict.js';
import { addBuilding } from './buildings.js';
import { getDistrictStyle } from './districtVariants.js';
import { createDistrictRandom } from '../seededRandom.js';
import { buildFoundation, paveAlleys } from './streets.js';
import { createTrafficLight } from './trafficLights.js';
import {
  LAMP_POSITIONS,
  addGreenery,
  addStreetFurniture,
  createStreetLamp,
  urbanAmenity,
} from './urbanProps.js';

/**
 * Build one district: foundation and roads first, then the blocks and the street layer.
 *
 * Roads stay flat while individual structures rise from their ground anchors, so the two
 * halves of a shared road connector always line up. The order of the batched calls is
 * part of the result: the district's generator is consumed in a fixed sequence, which is
 * what makes the architecture reproducible for a given index.
 *
 * @param {number} index
 * @param {THREE.Group} root
 * @param {(color: number | string) => THREE.Material} getMaterial
 * @param {THREE.Texture} haloTexture
 * @param {import('../../core/types.js').CityThemeId} [themeId]
 */
export function buildDistrictGeometry(
  index,
  root,
  getMaterial,
  haloTexture,
  themeId = DEFAULT_CITY_THEME,
) {
  const theme = getCityTheme(themeId);
  const random = createDistrictRandom(index);
  const style = getDistrictStyle(index, theme.id);
  /** @type {THREE.Sprite[]} */
  const halos = [];
  /** @type {ReturnType<typeof createTrafficLight>[]} */
  const signals = [];
  /** @type {{ root: THREE.Group, delay: number, growth: number }[]} */
  const emerging = [];

  let batch = new VoxelBatch();
  buildFoundation(batch, random);
  batch.build(root, getMaterial);

  /**
   * A group that grows out of the ground, anchored at street level.
   * @param {string} name
   * @param {number} delay Fraction of the reveal before this group starts.
   */
  function growthGroup(name, delay) {
    const anchor = new THREE.Group(),
      content = new THREE.Group();
    anchor.name = name;
    anchor.position.y = 0.25;
    content.position.y = -0.25;
    anchor.add(content);
    root.add(anchor);
    emerging.push({ root: anchor, delay, growth: 1 });
    return content;
  }

  for (const [i, config] of style.buildings.entries()) {
    const buildingBatch = new VoxelBatch();
    addBuilding(buildingBatch, config, index + i, theme.neon);
    buildingBatch.build(growthGroup(`building-${i}`, i * 0.12), getMaterial);
  }

  const objectRoot = growthGroup('street-objects', 0.08);
  batch = new VoxelBatch();
  if (theme.neon) neonStreetDetails(batch);
  else urbanAmenity(batch, style.amenity);
  addGreenery(batch, style.treeScale, random);
  addStreetFurniture(batch);
  paveAlleys(batch);
  for (const [x, z] of LAMP_POSITIONS)
    halos.push(
      createStreetLamp(batch, objectRoot, { x, z, haloTexture, haloColor: theme.haloColor }),
    );
  signals.push(createTrafficLight(batch, objectRoot, { x: 3.72, z: MAIN_ROAD_Z - 3.36 }));
  signals.push(
    createTrafficLight(batch, objectRoot, { x: -3.72, z: MAIN_ROAD_Z - 3.36, axis: 'cross' }),
  );
  batch.build(objectRoot, getMaterial);

  const traffic = new IntersectionTraffic(index, getMaterial);
  objectRoot.add(traffic.root);

  return { style, halos, signals, emerging, traffic };
}
