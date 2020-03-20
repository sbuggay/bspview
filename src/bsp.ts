
import { extract, typeMapping } from "./binary";

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

interface Face {
    plane: number;
    side: number;
    firstEdge: number;
    edges: number;
    styles: number;
    textureInfo: number;
    lightmapOffset: number;
}

interface Plane {
    x: number;
    y: number;
    z: number;
    dist: number;
    type: number;
}

export interface BSP {
    id: number;
    vertices: Vector3D[];
    edges: number[][];
    planes: Plane[];
    faces: Face[];
    surfEdges: number[];
}

export function parseBSP(buffer: ArrayBuffer): BSP {
    const view = new DataView(buffer);

    const id = view.getUint32(0, true);

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
    const vertices = extract(vertexView, ["Float32", "Float32", "Float32"]).map(vertex => {
        return {
            x: vertex[0],
            y: vertex[1],
            z: vertex[2]
        }
    });

    const edgeView = new DataView(buffer, lumpData["LUMP_EDGES"].offset, lumpData["LUMP_EDGES"].lumpLength);
    const edges = extract(edgeView, ["Uint16", "Uint16"]);

    const planeView = new DataView(buffer, lumpData["LUMP_PLANES"].offset, lumpData["LUMP_PLANES"].lumpLength);
    const planes = extract(planeView, ["Float32", "Float32", "Float32", "Float32", "Uint32"]);

    const surfEdgesView = new DataView(buffer, lumpData["LUMP_SURFEDGES"].offset, lumpData["LUMP_SURFEDGES"].lumpLength);
    const surfEdges = extract(surfEdgesView, ["Int32"]);

    const entityView = new DataView(buffer)

    const facesView = new DataView(buffer, lumpData["LUMP_FACES"].offset, lumpData["LUMP_FACES"].lumpLength);
    const faces = extract(facesView, ["Uint16", "Uint16", "Uint32", "Uint16", "Uint16", "Uint32", "Uint32"]).map(data => {
        return {
            plane: data[0],
            side: data[1],
            firstEdge: data[2],
            edges: data[3],
            textureInfo: data[4],
            styles: data[5],
            lightmapOffset: data[6]
        }
    });

    const bsp: BSP = {
        id,
        vertices,
        edges,
        planes,
        faces,
        surfEdges
    };

    return bsp;
}