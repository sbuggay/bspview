import {
    Color,
    CubeTextureLoader,
    DataTexture,
    Geometry,
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    RepeatWrapping,
    RGBAFormat,
    Vector2,
    Vector3,
} from "three";
import { Bsp, Face } from "./Bsp";
import { WadManager } from "./WadManager";
import { triangulate, triangulateUV, isSpecialBrush } from "./utils";
import { QuakeTexture } from "./QuakeTexture";

// eslint-disable-next-line
const missing = require("../docs/missing.png");


export class QuakeMap {
    private bsp: Bsp;

    private mergedMesh: Mesh;
    private requiredWads: string[];

    constructor(private buffer: ArrayBuffer, private wadManager: WadManager) {
        // Parse and update BSP
        this.bsp = new Bsp(this.buffer);
        // bspInfo.update(bsp);
        const worldSpawn = this.bsp.getWorldspawn();
        const requiredWadsStr = (worldSpawn as any).wad as string;
        this.requiredWads = requiredWadsStr
            .split(";")
            .map((fullPath) => fullPath.split("\\").slice(-1))
            .flat()
            .filter(wad => wad.length > 0);

        wadManager.setRequiredWads(this.requiredWads);

        // var textureCube = createCubeMap();
        // var shader = ShaderLib.cube;
        // shader.uniforms['envMap'].value = textureCube;
        // console.log(shader.uniforms);
        // // shader.uniforms["tCube"].value = textureCube;
        // var cubeTest = new ShaderMaterial({
        //     fragmentShader: shader.fragmentShader,
        //     vertexShader: shader.vertexShader,
        //     uniforms: shader.uniforms,
        //     depthWrite: false,
        //     side: BackSide
        // });

        // Build materials
        const materials = this.bsp.textures.map((texture) => {

            if (texture.name === 'sky') {
                // return skyboxMaterial;
            }

            // If offset is 0, texture is in WAD
            if (texture.offset1 === 0) {
                const data = this.wadManager.find(texture.name);

                data.wrapS = data.wrapT = RepeatWrapping;
                const material = new MeshStandardMaterial({
                    map: data,
                });

                return material;
            }

            const mip = texture.globalOffset + texture.offset1;
            const t = new Uint8Array(
                buffer.slice(mip, mip + texture.width * texture.height)
            );

            const quakeTexture = new QuakeTexture(texture.palette, t);

            const dataTexture = new DataTexture(
                quakeTexture.data(),
                texture.width,
                texture.height,
                RGBAFormat
            );
            dataTexture.wrapS = dataTexture.wrapT = RepeatWrapping;
            return new MeshPhongMaterial({
                map: dataTexture,
                // envMap: dataTexture,
                transparent: quakeTexture.transparant(),
                vertexColors: true,
            });
        });

        // First model is always the parent level node
        const levelModel = this.bsp.models[0];
        const levelNodes = [this.bsp.nodes[levelModel.nodes[0]]];
        const levelLeaves: number[] = [];

        while (levelNodes.length > 0) {
            const n = levelNodes.pop();
            const front = n.front;
            const back = n.back;

            const parse = (n: number) => {
                // Ignore -1 leaves here, they are dummy leaves
                if (n < -1) {
                    levelLeaves.push(Math.abs(n) - 1);
                } else if (n >= 0) {
                    levelNodes.push(this.bsp.nodes[n]);
                }
            };

            parse(front);
            parse(back);
        }

        const geom = new Geometry();

        levelLeaves.forEach((leafId) => {
            const leaf = this.bsp.leaves[leafId];

            for (let faceOffset = 0; faceOffset < leaf.faces; faceOffset++) {
                const face = this.bsp.faces[leaf.face + faceOffset];
                if (!face) return;

                const faceMesh = this.getGeometryFromFace(face);

                if (faceMesh !== null) {
                    geom.merge(
                        faceMesh.geometry as Geometry,
                        faceMesh.matrix,
                        this.bsp.texInfo[face.textureInfo].mipTex
                    );
                }
            }
        });

        this.mergedMesh = new Mesh(geom, materials);
    }

    private getGeometryFromFace(face: Face) {
        const geometry = new Geometry();

        if (face === undefined) return null;

        const texinfo = this.bsp.texInfo[face.textureInfo];
        const miptex = this.bsp.textures[texinfo.mipTex];
        const lighting = this.bsp.lighting[face.lightmapOffset / 3]; // Divided by 3 because the offset is in bytes

        if (isSpecialBrush(miptex)) {
            return null;
        }

        const uvs = [];

        for (let i = 0; i < face.edges; i++) {
            const surfEdge = this.bsp.surfEdges[face.firstEdge + i];
            const edge = this.bsp.edges[Math.abs(surfEdge)];

            // We only need to care about the first vertex here, the second one will be duplicated in the next edge
            let v1 = this.bsp.vertices[edge[0]];

            // Unless surfEdge is negative, meaning it's the wrong way around. Flip it.
            if (surfEdge < 0) {
                v1 = this.bsp.vertices[edge[1]];
            }

            const vertex = new Vector3(v1.y, v1.z, v1.x);
            geometry.vertices.push(vertex);

            if (lighting) {
                geometry.colors.push(
                    new Color(lighting[0], lighting[1], lighting[2])
                );
            }

            const vectorS = new Vector3(
                texinfo.vs.y,
                texinfo.vs.z,
                texinfo.vs.x
            );
            const vectorT = new Vector3(
                texinfo.vt.y,
                texinfo.vt.z,
                texinfo.vt.x
            );
            const U = (vertex.dot(vectorS) + texinfo.sShift) / miptex.width;
            const V = (vertex.dot(vectorT) + texinfo.tShift) / miptex.height;

            uvs.push(new Vector2(U, V));
        }

        geometry.faces = triangulate(geometry.vertices);
        geometry.faceVertexUvs[0] = triangulateUV(uvs);

        geometry.computeFaceNormals();
        geometry.uvsNeedUpdate = true;

        const mesh = new Mesh(geometry);

        return mesh;
    }

    public mesh(): Mesh {
        return this.mergedMesh;
    }

    public wads(): string[] {
        return this.requiredWads;
    }
}
