
import { extract, TypeMapping } from "./binary";
import { Vector3 } from "three";

const HEADER30 = [
    "ENTITIES",
    "PLANES",
    "TEXTURES",
    "VERTICES",
    "VISIBILITY",
    "NODES",
    "TEXINFO",
    "FACES",
    "LIGHTING",
    "CLIPNODES",
    "LEAVES",
    "MARKSURFACES",
    "EDGES",
    "SURFEDGES",
    "MODELS",
    "HEADER_LUMPS"
]

interface Header {
    id: number;
    lumps: { [key: string]: Lump };
}

export interface Lump {
    name: string;
    offset: number;
    size: number;
}

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

interface Entity {
    origin?: string;
    classname?: string;
    _light?: string;
    style?: string;
    angle?: number;
}

interface Model {
    min: number[];
    max: number[];
    origin: number[];
    nodes: number[];
    visLeafs: number;
    firstFace: number;
    faces: number;
}

interface Texture {
    name: string;
    width: number;
    height: number;
    offset1: number;
    offset2: number;
    offset4: number;
    offset8: number;
    palette: Uint8Array;
    globalOffset: number; // Offset into the total bsp
}

interface TexInfo {
    vs: number[];
    sShift: number;
    vt: number[];
    tShift: number;
    mipTex: number;
    flags: number;
}

export interface BSP {
    header: Header;
    vertices: Vector3D[];
    edges: number[][];
    planes: Plane[];
    faces: Face[];
    surfEdges: number[];
    entities: Entity[];
    texInfo: TexInfo[];
    models: Model[];
    textures: Texture[];
}

function parseHeader(buffer: ArrayBuffer) {

    const view = new DataView(buffer);
    let id = view.getUint32(0, true);

    const lumpData: { [key: string]: Lump } = {}

    for (let i = 0; i < HEADER30.length; i++) {
        let lumpType = HEADER30[i];
        const offset = view.getUint32((i * 8) + 4, true);
        const size = view.getUint32((i * 8) + 8, true);
        lumpData[lumpType] = { name: lumpType, offset, size };
    }

    return {
        id,
        lumps: lumpData
    };
}

function extractLump(buffer: ArrayBuffer, lump: Lump, types: (keyof TypeMapping)[]) {
    return extract(new DataView(buffer, lump.offset, lump.size), types);
}

function parseEntities(entityString: string) {

    const split = entityString.split("\n");
    const entities: any[] = [];
    let tempObject: { [key: string]: string } = {};

    split.forEach(line => {
        if (line === "{") {
            // new temp object
            tempObject = {};
        }
        else if (line === "}") {
            // push to entities
            entities.push(tempObject);
        }
        else {
            const data = line.replace(/\"/g, "").split(" ");
            tempObject[data[0]] = data.slice(1).join(" ");
        }
    });

    return entities;
}

export function parseBSP(buffer: ArrayBuffer): BSP {

    const header = parseHeader(buffer);
    const lumps = header.lumps;

    console.table(lumps);

    // Entities is a special case
    const entityLump = lumps["ENTITIES"];
    const entityString = Buffer.from(buffer.slice(entityLump.offset, entityLump.offset + entityLump.size)).toString("ascii");
    const entities = parseEntities(entityString);

    const vertices = extractLump(buffer, lumps["VERTICES"], ["Float32", "Float32", "Float32"]).map(vertex => {
        return {
            x: vertex[0],
            y: vertex[1],
            z: vertex[2]
        }
    });

    const edges = extractLump(buffer, lumps["EDGES"], ["Uint16", "Uint16"]);
    const planes = extractLump(buffer, lumps["PLANES"], ["Float32", "Float32", "Float32", "Float32", "Uint32"]);
    const surfEdges = extractLump(buffer, lumps["SURFEDGES"], ["Int32"]);
    const texInfo = extractLump(buffer, lumps["TEXINFO"], ["Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Uint32", "Uint32"]).map(data => {
        return {
            vs: [data[0], data[1], data[2]],
            sShift: data[3],
            vt: [data[4], data[5], data[6]],
            tShift: data[7],
            mipTex: data[8],
            flags: data[9]
        }
    });

    const models = extractLump(buffer, lumps["MODELS"], ["Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Int32", "Int32", "Int32", "Int32", "Int32", "Int32", "Int32"]).map(data => {
        return {
            min: [data[0], data[1], data[2]],
            max: [data[3], data[4], data[5]],
            origin: [data[6], data[7], data[8]],
            nodes: [data[9], data[10], data[11], data[12]],
            visLeafs: data[13],
            firstFace: data[14],
            faces: data[15]
        }
    });

    const faces = extractLump(buffer, lumps["FACES"], ["Uint16", "Uint16", "Uint32", "Uint16", "Uint16", "Uint32", "Uint32"]).map(data => {
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

    // Parse textures
    const textureLump = lumps["TEXTURES"];
    const textureView = new DataView(buffer.slice(textureLump.offset, textureLump.offset + textureLump.size));

    const numTextures = textureView.getUint32(0, true);

    const offsetView = new DataView(buffer, textureLump.offset + 4, (numTextures * 4));
    const textureOffsets = extract(offsetView, ["Int32"]);

    const textures: Texture[] = [];

    textureOffsets.forEach(offset => {
        const o = textureLump.offset + offset;
        const name = Buffer.from(buffer.slice(o, o + 16)).toString("ascii");
        const mipView = new DataView(buffer, o + 16, 24);
        const data = extract(mipView, ["Uint32", "Uint32", "Uint32", "Uint32", "Uint32", "Uint32"]).map(data => {
            const paletteOffset = o + data[5] + (data[0] * data[1] / 8) + 2;
            const paletteSize = 256 * 3;
            const palette = new Uint8Array(buffer.slice(paletteOffset, paletteOffset + paletteSize));
            return {
                name,
                width: data[0],
                height: data[1],
                offset1: data[2],
                offset2: data[3],
                offset4: data[4],
                offset8: data[5],
                palette,
                globalOffset: o
            }
        });
        textures.push(...data);
    });

    const bsp: BSP = {
        header,
        vertices,
        edges,
        planes,
        entities,
        faces,
        surfEdges,
        texInfo,
        models,
        textures
    };

    return bsp;
}