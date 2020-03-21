// Copied from https://github.com/mrdoob/three.js/blob/master/examples/jsm/utils/BufferGeometryUtils.js

import * as THREE from "three";

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
