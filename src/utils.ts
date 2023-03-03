// Copied from https://github.com/mrdoob/three.js/blob/master/examples/jsm/utils/BufferGeometryUtils.js

import * as THREE from "three";
import { Vector3, Face3, Vector2, Plane } from "three";
import { Bsp, Texture } from "./bsp";

/**
	 * @param  {Array<BufferGeometry>} geometries
	 * @param  {Boolean} useGroups
	 * @return {BufferGeometry}
	 */
export function mergeBufferGeometries(geometries: any[], useGroups: any) {

    var isIndexed = geometries[0].index !== null;
    var attributesUsed = new Set(Object.keys(geometries[0].attributes));
    var morphAttributesUsed = new Set(Object.keys(geometries[0].morphAttributes));
    var attributes: any = {};
    var morphAttributes: any = {};
    var morphTargetsRelative = geometries[0].morphTargetsRelative;
    var mergedGeometry = new THREE.BufferGeometry();
    var offset = 0;

    for (var i = 0; i < geometries.length; ++i) {

        var geometry = geometries[i];

        // ensure that all geometries are indexed, or none

        if (isIndexed !== (geometry.index !== null)) return null;

        // gather attributes, exit early if they're different

        for (var name in geometry.attributes) {
            if (!attributesUsed.has(name)) return null;
            if (attributes[name] === undefined) attributes[name] = [];
            attributes[name].push(geometry.attributes[name]);
        }

        // gather morph attributes, exit early if they're different

        if (morphTargetsRelative !== geometry.morphTargetsRelative) return null;

        for (var name in geometry.morphAttributes) {
            if (!morphAttributesUsed.has(name)) return null;
            if (morphAttributes[name] === undefined) morphAttributes[name] = [];
            morphAttributes[name].push(geometry.morphAttributes[name]);
        }

        // gather .userData

        mergedGeometry.userData.mergedUserData = mergedGeometry.userData.mergedUserData || [];
        mergedGeometry.userData.mergedUserData.push(geometry.userData);

        if (useGroups) {
            var count;
            if (isIndexed) {
                count = geometry.index.count;
            } else if (geometry.attributes.position !== undefined) {
                count = geometry.attributes.position.count;
            } else {
                return null;
            }

            mergedGeometry.addGroup(offset, count, i);
            offset += count;
        }
    }

    // merge indices

    if (isIndexed) {

        var indexOffset = 0;
        var mergedIndex = [];

        for (var i = 0; i < geometries.length; ++i) {
            var index = geometries[i].index;

            for (var j = 0; j < index.count; ++j) {
                mergedIndex.push(index.getX(j) + indexOffset);
            }

            indexOffset += geometries[i].attributes.position.count;
        }

        mergedGeometry.setIndex(mergedIndex);
    }

    // merge attributes
    for (var name in attributes) {
        var mergedAttribute = mergeBufferAttributes(attributes[name]);
        if (!mergedAttribute) return null;
        mergedGeometry.setAttribute(name, mergedAttribute);
    }

    // merge morph attributes
    for (var name in morphAttributes) {
        var numMorphTargets = morphAttributes[name][0].length;

        if (numMorphTargets === 0) break;

        mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
        mergedGeometry.morphAttributes[name] = [];

        for (var i = 0; i < numMorphTargets; ++i) {
            var morphAttributesToMerge = [];

            for (var j = 0; j < morphAttributes[name].length; ++j) {
                morphAttributesToMerge.push(morphAttributes[name][j][i]);
            }

            var mergedMorphAttribute = mergeBufferAttributes(morphAttributesToMerge);
            if (!mergedMorphAttribute) return null;
            mergedGeometry.morphAttributes[name].push(mergedMorphAttribute);
        }
    }
    return mergedGeometry;
}


/**
	 * @param {Array<BufferAttribute>} attributes
	 * @return {BufferAttribute}
	 */
function mergeBufferAttributes(attributes: any) {

    var TypedArray;
    var itemSize;
    var normalized;
    var arrayLength = 0;

    for (var i = 0; i < attributes.length; ++i) {

        var attribute = attributes[i];

        if (attribute.isInterleavedBufferAttribute) return null;

        if (TypedArray === undefined) TypedArray = attribute.array.constructor;
        if (TypedArray !== attribute.array.constructor) return null;

        if (itemSize === undefined) itemSize = attribute.itemSize;
        if (itemSize !== attribute.itemSize) return null;

        if (normalized === undefined) normalized = attribute.normalized;
        if (normalized !== attribute.normalized) return null;

        arrayLength += attribute.array.length;

    }

    var array = new TypedArray(arrayLength);
    var offset = 0;

    for (var i = 0; i < attributes.length; ++i) {
        array.set(attributes[i].array, offset);
        offset += attributes[i].array.length;
    }

    return new THREE.BufferAttribute(array, itemSize, normalized);
}

// Triangulating BSP edges is very easy, edge reversal is already done before it reaches here.
export function triangulate(vertices: Vector3[]): THREE.Face3[] {
    vertices = vertices.reverse();

    if (vertices.length < 3) {
        return [];
    }

    const faces: THREE.Face3[] = [];
    for (let i = 1; i < vertices.length - 1; i++) {
        faces.push(new Face3(0, i, i + 1));
    }
    return faces;
}

export function triangulateUV(UVs: Vector2[]): Vector2[][] {
    UVs = UVs.reverse();

    if (UVs.length < 3) {
        return [];
    }

    const UVOut: Vector2[][] = [];
    for (let i = 1; i < UVs.length - 1; i++) {
        UVOut.push([UVs[0], UVs[i], UVs[i + 1]]);
    }

    return UVOut;
}

export function findLeaf(bsp: Bsp, position: Vector3): number {

    let i = 0;

    while (i >= 0) {
        let node = bsp.nodes[i];
        const plane = bsp.planes[node.plane];
        const p = new Plane(new Vector3(plane.y, plane.z, plane.x), plane.dist);
        const d = p.normal.dot(position) - p.constant;
        i = (d > 0) ? node.front : node.back;
    }

    return -(i + 1);
}

export function getVisibilityList(bsp: Bsp, leafIndex: number): number[] {
    if (leafIndex <= 0) return [];
    const leaf = bsp.leaves[leafIndex];

    let v = leaf.vislist;
    let pvs = 1;

    const leafIndices = [];

    while (pvs < bsp.leaves.length) {
        // zeroes are RLE
        if (bsp.visibility[v] === 0) {
            // skip some leaves
            pvs += (8 * bsp.visibility[v + 1]);
            v++; // skip the encoded part
        }
        else // tag 8 leaves, if needed
        { // examine bits right to left
            for (let bit = 1; bit < Math.pow(2, 8); bit = bit * 2) {
                if ((bsp.visibility[v] & bit) > 0)
                    if (pvs < bsp.leaves.length) {
                        leafIndices.push(pvs);
                        // leaves[pvs].visible = true;
                    }
                pvs++;
            }
        }

        v++;
    }

    return leafIndices;
}

export function parseString(buffer: ArrayBuffer) {
    const a = new Uint8Array(buffer);
    const nullIndex = a.indexOf(0);
    const s = Buffer.from(buffer.slice(0, nullIndex)).toString().toLowerCase();
    return s;
}

const specialTextures = [
    "aaatrigger"
];

export function isSpecialBrush(texture: Texture) {
    return specialTextures.includes(texture.name);
}