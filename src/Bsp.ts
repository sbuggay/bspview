import { TypedDataView, TypeMapping } from "./TypedDataView";
import { Color, Vector3 } from "three";
import { parseString } from "./utils";
import { Palette, QuakePalette } from "./palette";

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
    "HEADER_LUMPS",
];

interface Header {
    id: number;
    lumps: { [key: string]: Lump };
}

export interface Lump {
    name: string;
    offset: number;
    size: number;
}

export interface Node {
    plane: number;
    front: number;
    back: number;
    bbox: [Vector3, Vector3];
    face: number; // First face
    faces: number; // Number of faces
}

export interface Leaf {
    type: number;
    vislist: number;
    bbox: [Vector3, Vector3];
    face: number;
    faces: number;
    ambient: number[];
}

export interface Face {
    plane: number;
    side: number;
    firstEdge: number;
    edges: number;
    styles: number;
    textureInfo: number;
    lightmapOffset: number;
}

export interface Plane {
    x: number;
    y: number;
    z: number;
    dist: number;
    type: number;
}

export interface Entity {
    origin?: string;
    classname?: string;
    _light?: string;
    style?: string;
    angle?: number;
}

export interface Model {
    min: number[];
    max: number[];
    origin: number[];
    nodes: number[];
    visLeafs: number;
    firstFace: number;
    faces: number;
}

export interface Texture {
    name: string;
    width: number;
    height: number;
    offset1: number;
    offset2: number;
    offset4: number;
    offset8: number;
    pixels?: Uint8Array;
    palette?: Color[];
    globalOffset?: number; // Offset into the file
}

export interface TexInfo {
    vs: Vector3;
    sShift: number;
    vt: Vector3;
    tShift: number;
    mipTex: number;
    flags: number;
}

export class Bsp {
    header: Header;
    nodes: Node[];
    leaves: Leaf[];
    visibility: number[];
    vertices: Vector3[];
    edges: number[][];
    planes: Plane[];
    faces: Face[];
    surfEdges: number[];
    entities: Entity[];
    texInfo: TexInfo[];
    models: Model[];
    textures: Texture[];
    lighting: number[][];

    constructor(buffer: ArrayBuffer) {
        this.header = this.parseHeader(buffer);
        const lumps = this.header.lumps;
        this.edges = this.extractLump(buffer, lumps["EDGES"], [
            "Uint16",
            "Uint16",
        ]);
        this.planes = this.extractLump(buffer, lumps["PLANES"], [
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Uint32",
        ]).map((data) => {
            return {
                x: data[0],
                y: data[1],
                z: data[2],
                dist: data[3],
                type: data[4],
            };
        });
        this.surfEdges = this.extractLump(buffer, lumps["SURFEDGES"], [
            "Int32",
        ]);

        // [TODO] This depends on BSP version (1b vs 3b)
        this.lighting =
            this.header.id === 30
                ? this.extractLump(buffer, lumps["LIGHTING"], [
                      "Uint8",
                      "Uint8",
                      "Uint8",
                  ])
                : this.extractLump(buffer, lumps["LIGHTING"], ["Uint8"]);

        // Entities is a special case
        const entityLump = lumps["ENTITIES"];
        const entityString = Buffer.from(
            buffer.slice(entityLump.offset, entityLump.offset + entityLump.size)
        ).toString("ascii");
        this.entities = this.parseEntities(entityString);

        this.vertices = this.extractLump(buffer, lumps["VERTICES"], [
            "Float32",
            "Float32",
            "Float32",
        ]).map((vertex) => {
            return new Vector3(vertex[0], vertex[1], vertex[2]);
        });

        this.nodes = this.extractLump(buffer, lumps["NODES"], [
            "Uint32",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Uint16",
            "Uint16",
        ]).map((data) => {
            return {
                plane: data[0],
                front: data[1],
                back: data[2],
                bbox: [
                    new Vector3(data[3], data[4], data[5]),
                    new Vector3(data[6], data[7], data[8]),
                ],
                face: data[9],
                faces: data[10],
            };
        });

        this.leaves = this.extractLump(buffer, lumps["LEAVES"], [
            "Int32",
            "Int32",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Int16",
            "Uint16",
            "Uint16",
            "Uint8",
            "Uint8",
            "Uint8",
            "Uint8",
        ]).map((data) => {
            return {
                type: data[0],
                vislist: data[1],
                bbox: [
                    new Vector3(data[2], data[3], data[4]),
                    new Vector3(data[5], data[6], data[7]),
                ],
                face: data[8],
                faces: data[9],
                ambient: [data[10], data[11], data[12], data[13]],
            };
        });

        // Parse visplane
        this.visibility = this.extractLump(buffer, lumps["VISIBILITY"], [
            "Uint8",
        ]);

        // Parse textures
        this.texInfo = this.extractLump(buffer, lumps["TEXINFO"], [
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Uint32",
            "Uint32",
        ]).map((data) => {
            return {
                vs: new Vector3(data[0], data[1], data[2]),
                sShift: data[3],
                vt: new Vector3(data[4], data[5], data[6]),
                tShift: data[7],
                mipTex: data[8],
                flags: data[9],
            };
        });

        // Parse models
        this.models = this.extractLump(buffer, lumps["MODELS"], [
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Float32",
            "Int32",
            "Int32",
            "Int32",
            "Int32",
            "Int32",
            "Int32",
            "Int32",
        ]).map((data) => {
            return {
                min: [data[0], data[1], data[2]],
                max: [data[3], data[4], data[5]],
                origin: [data[6], data[7], data[8]],
                nodes: [data[9], data[10], data[11], data[12]],
                visLeafs: data[13],
                firstFace: data[14],
                faces: data[15],
            };
        });

        // Parse faces
        this.faces = this.extractLump(buffer, lumps["FACES"], [
            "Uint16",
            "Uint16",
            "Uint32",
            "Uint16",
            "Uint16",
            "Uint32",
            "Uint32",
        ]).map((data) => {
            return {
                plane: data[0],
                side: data[1],
                firstEdge: data[2],
                edges: data[3],
                textureInfo: data[4],
                styles: data[5],
                lightmapOffset: data[6],
            };
        });

        // Parse textures
        const textureLump = lumps["TEXTURES"];
        const textureView = new DataView(
            buffer.slice(
                textureLump.offset,
                textureLump.offset + textureLump.size
            )
        );

        const numTextures = textureView.getUint32(0, true);

        const offsetView = new DataView(
            buffer,
            textureLump.offset + 4,
            numTextures * 4
        );
        const textureOffsets = new TypedDataView(offsetView).asTypes(["Int32"]);

        const textures: Texture[] = [];

        textureOffsets.forEach((offset) => {
            const o = textureLump.offset + offset;
            const name = parseString(Buffer.from(buffer.slice(o, o + 16)));
            const mipView = new DataView(buffer, o + 16, 24);
            const data = new TypedDataView(mipView)
                .asTypes([
                    "Uint32",
                    "Uint32",
                    "Uint32",
                    "Uint32",
                    "Uint32",
                    "Uint32",
                ])
                .map((data) => {
                    const width = data[0];
                    const height = data[1];
                    const offset1 = data[2];
                    const offset2 = data[3];
                    const offset4 = data[4];
                    const offset8 = data[5];
                    const palleteOffset =
                        o + offset8 + Math.floor((width * height) / 64) + 2;
                    const paletteArray = new Uint8Array(
                        buffer.slice(palleteOffset, palleteOffset + 256 * 3)
                    );

                    const palette =
                        this.header.id === 30
                            ? new Palette(Array.from(paletteArray)).colors()
                            : new QuakePalette().colors();

                    return {
                        name,
                        width,
                        height,
                        offset1,
                        offset2,
                        offset4,
                        offset8,
                        palette,
                        globalOffset: o,
                    };
                });

            textures.push(...data);
        });

        this.textures = textures;
    }

    extractLump(buffer: ArrayBuffer, lump: Lump, types: (keyof TypeMapping)[]) {
        return new TypedDataView(
            new DataView(buffer, lump.offset, lump.size)
        ).asTypes(types);
    }

    parseHeader(buffer: ArrayBuffer) {
        const view = new DataView(buffer);
        const id = view.getUint32(0, true);

        const lumpData: { [key: string]: Lump } = {};

        for (let i = 0; i < HEADER30.length; i++) {
            const lumpType = HEADER30[i];
            const offset = view.getUint32(i * 8 + 4, true);
            const size = view.getUint32(i * 8 + 8, true);
            lumpData[lumpType] = { name: lumpType, offset, size };
        }

        return {
            id,
            lumps: lumpData,
        };
    }

    parseEntities(entityString: string) {
        const split = entityString.split("\n");
        const entities: any[] = [];
        let tempObject: { [key: string]: string } = {};

        split.forEach((line) => {
            if (line === "{") {
                // new temp object
                tempObject = {};
            } else if (line === "}") {
                // push to entities
                entities.push(tempObject);
            } else {
                const data = line.replace(/"/g, "").split(" ");
                tempObject[data[0]] = data.slice(1).join(" ");
            }
        });

        return entities;
    }

    // Grabs the worldspawn entity
    getWorldspawn() {
        return this.entities.filter(
            (entity) => entity.classname === "worldspawn"
        )[0];
    }
}
