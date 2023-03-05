import { BoxGeometry, BufferGeometry, Color, DataTexture, Geometry, Matrix4, Mesh, MeshBasicMaterial, MeshNormalMaterial, MeshStandardMaterial, RepeatWrapping, RGBAFormat, SphereGeometry, TextureLoader, Vector2, Vector3 } from "three";
import { Bsp, Entity, Face } from "./Bsp";
import { WadManager } from "./WadManager";
import { triangulate, mergeBufferGeometries, triangulateUV, isSpecialBrush } from "./utils";

const missing = require('../docs/missing.png');

export class QuakeMap {

    private bsp: Bsp;
    private entites: Entity[];
    private mergedMesh: Mesh;

    public mesh(): Mesh {
        return this.mergedMesh;
    }

    constructor(private buffer: ArrayBuffer, private wadManager: WadManager) {
        // Parse and update BSP
        this.bsp = new Bsp(this.buffer);
        // bspInfo.update(bsp);
        const worldSpawn = this.bsp.getWorldspawn();
        const requiredWadsStr = (worldSpawn as any).wad as string;
        const requiredWads = requiredWadsStr.split(';').map(fullPath => fullPath.split('\\').slice(-1));
        console.log(requiredWads);

        // We are going to store each model's starting face here so not to render it as a normal face
        const modelFaces: { [key: number]: number } = {};
        const modelMeshes: Mesh[] = [];

        // Build materials
        const materials = this.bsp.textures.map((texture) => {

            const developmentTexture = new TextureLoader().load(missing);
            developmentTexture.wrapS = developmentTexture.wrapT = RepeatWrapping;

            // If offset is 0, texture is in WAD
            if (texture.offset1 === 0) {
                const data = this.wadManager.getTexture(texture.name);

                if (data) {
                    const dataTexture = new DataTexture(data, texture.width, texture.height, RGBAFormat);
                    dataTexture.wrapS = dataTexture.wrapT = RepeatWrapping;
                    const material = new MeshStandardMaterial({
                        map: dataTexture
                    });

                    return material;
                }
                else {
                    var developmentMaterial = new MeshStandardMaterial({ map: developmentTexture });
                    return developmentMaterial;
                }
            }

            const mip = texture.globalOffset + texture.offset1;
            const t = new Uint8Array(buffer.slice(mip, mip + (texture.width * texture.height)));

            const data = [];
            const isTransparant = (r: number, g: number, b: number) => (r === 0 && g === 0 && b === 255); // Build alphaMap. 0x0000FF means transparent
            let transparent = false;

            for (let i = 0; i < t.length; i++) {
                const r = texture.palette[t[i]][0];
                const g = texture.palette[t[i]][1];
                const b = texture.palette[t[i]][2];
                data.push(r, g, b);
                data.push(isTransparant(r, g, b) ? 0 : 255);

                // Set the transparency flag if it's ever hit.
                if (isTransparant(r, g, b) && !transparent) transparent = true;
            }

            const dataTexture = new DataTexture(new Uint8Array(data), texture.width, texture.height, RGBAFormat);
            dataTexture.wrapS = dataTexture.wrapT = RepeatWrapping;
            return new MeshStandardMaterial({
                map: dataTexture,
                transparent,
                vertexColors: true
            });
        });

        // Create model debug volumes
        this.bsp.models.forEach((model, index) => {
            const depth = Math.abs(model.max[0] - model.min[0]);
            const width = Math.abs(model.max[1] - model.min[1]);
            const height = Math.abs(model.max[2] - model.min[2]);
            const geometry = new BoxGeometry(width, height, depth);

            const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: 0x00aa11, wireframe: true }));
            mesh.position.set((model.max[1] + model.min[1]) / 2, (model.max[2] + model.min[2]) / 2, (model.max[0] + model.min[0]) / 2)
            mesh.visible = false;
            modelMeshes.push(mesh);

            // Add to faceStarts
            if (index === 0) return; // Dont add first face model (is this true for all maps?)
            modelFaces[model.firstFace] = model.faces;
        });

        const faceMeshes: Mesh[] = [];

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
                }
                else if (n >= 0) {
                    levelNodes.push(this.bsp.nodes[n])
                }
            }

            parse(front);
            parse(back);
        }

        const geom = new Geometry();

        const freq: { [key: number]: number } = {};

        levelLeaves.forEach(leafId => {
            const leaf = this.bsp.leaves[leafId];

            for (let faceOffset = 0; faceOffset < leaf.faces; faceOffset++) {
                const face = this.bsp.faces[leaf.face + faceOffset];
                if (!face) return;

                const faceMesh = this.getGeometryFromFace(face);

                if (faceMesh !== null) {
                    geom.merge(faceMesh.geometry as Geometry, faceMesh.matrix, this.bsp.texInfo[face.textureInfo].mipTex);
                }
            }
        });

        this.mergedMesh = new Mesh(geom, materials);

        //Entity representations
        const baseGeometry = new BufferGeometry().fromGeometry(new SphereGeometry(5, 6, 6))
        const entityGeos: any[] = [];

        this.bsp.entities.forEach(entity => {
            if (!entity.origin) return;
            const split = entity.origin.split(" ");
            const x = parseFloat(split[0]);
            const y = parseFloat(split[1]);
            const z = parseFloat(split[2]);

            var geometry = baseGeometry.clone()
            geometry.applyMatrix4(new Matrix4().makeTranslation(y, z, x));
            // then, we push this bufferGeometry instance in our array
            entityGeos.push(geometry)
        });

        const geometriesCubes = mergeBufferGeometries(entityGeos, false);
        const entityMesh = new Mesh(geometriesCubes, new MeshNormalMaterial());
        entityMesh.visible = false;

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
                geometry.colors.push(new Color(lighting[0], lighting[1], lighting[2]));
            }

            const vectorS = new Vector3(texinfo.vs.y, texinfo.vs.z, texinfo.vs.x);
            const vectorT = new Vector3(texinfo.vt.y, texinfo.vt.z, texinfo.vt.x);
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

}