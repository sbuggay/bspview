
// #define LUMP_ENTITIES      0
// #define LUMP_PLANES        1
// #define LUMP_TEXTURES      2
// #define LUMP_VERTICES      3
// #define LUMP_VISIBILITY    4
// #define LUMP_NODES         5
// #define LUMP_TEXINFO       6
// #define LUMP_FACES         7
// #define LUMP_LIGHTING      8
// #define LUMP_CLIPNODES     9
// #define LUMP_LEAVES       10
// #define LUMP_MARKSURFACES 11
// #define LUMP_EDGES        12
// #define LUMP_SURFEDGES    13
// #define LUMP_MODELS       14
// #define HEADER_LUMPS      15

// typedef struct _VECTOR3D
// {
//     float x, y, z;
// } VECTOR3D;

const lumps = [
    "LUMP_ENTITIES",
    "LUMP_PLANES",
    "LUMP_TEXTURES",
    "LUMP_VERTICES",
    "LUMP_VISIBILITY",
    "LUMP_NODES",
    "LUMP_TEXINFO",
    "LUMP_FACES",
    "LUMP_LIGHTING",
    "LUMP_CLIPNODES",
    "LUMP_LEAVES",
    "LUMP_MARKSURFACES",
    "LUMP_EDGES",
    "LUMP_SURFEDGES",
    "LUMP_MODELS",
    "HEADER_LUMPS"
]

interface Vector3D {
    x: number;
    y: number;
    z: number;
}

interface BSP {
    vertices: Vector3D[];
    edges: number[][];
}

export function parseBSP(buffer: ArrayBuffer): BSP {
    const view = new DataView(buffer);
    console.log(view.getUint32(0, true));

    const lumpData: { [key: string]: any } = {};

    for (let i = 0; i < lumps.length; i++) {
        let lumpType = lumps[i];
        const offset = view.getUint32((i * 8) + 4, true);
        const lumpLength = view.getUint32((i * 8) + 8, true);
        lumpData[lumpType] = { offset, lumpLength };
    }

    console.table(lumpData);

    // Parse vertices
    const vertexView = new DataView(buffer, lumpData["LUMP_VERTICES"].offset, lumpData["LUMP_VERTICES"].lumpLength);
    const vertices = [];
    for (let offset = 0; offset < vertexView.byteLength; offset += 12) {
        const x = vertexView.getFloat32(offset, true);
        const y = vertexView.getFloat32(offset + 4, true);
        const z = vertexView.getFloat32(offset + 8, true);
        vertices.push({
            x, y, z
        });
    }

    const edgeView = new DataView(buffer, lumpData["LUMP_EDGES"].offset, lumpData["LUMP_EDGES"].lumpLength);
    const edges = [];
    for (let offset = 0; offset < edgeView.byteLength; offset += 4) {
        const a = edgeView.getUint16(offset, true);
        const b = edgeView.getUint16(offset + 2, true);
        edges.push([a, b]);
    }

    const bsp: BSP = {
        vertices,
        edges
    };

    return bsp;
}

// function parseVector3D(buffer: ArrayBuffer) {
//     return {
//         x: buffer.
//     }
// }