import { parseBSP, Node } from "./bsp";
import * as THREE from "three";

import * as Stats from "stats.js";
import { Controls } from "./Controls";
import { DescriptionInfo, maps } from "./info/DescriptionInfo";
import { BspInfo } from "./info/BspInfo";
import { triangulate, mergeBufferGeometries, triangulateUV } from "./utils";
import { Vector3, Face3, Mesh, Color, Quaternion, Vector2, Material, Box3, CameraHelper, Plane, Geometry } from "three";

const LIGHT_LIMIT = 8;

const viewElement = document.body;
const dashboardElement = document.getElementById("dashboard");
const topElement = document.getElementById("top");
const bottomElement = document.getElementById("bottom");

var stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

var canvas = document.createElement('canvas');
var context = canvas.getContext('webgl2', { alpha: false });

const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 10, 3000);
const renderer = new THREE.WebGLRenderer({ canvas, context });
const controls = new Controls(camera, renderer.domElement);
const raycaster = new THREE.Raycaster();

renderer.setSize(window.innerWidth, window.innerHeight);

viewElement.appendChild(renderer.domElement);

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const controlElement = new DescriptionInfo(topElement, (event) => {
    const value = (event.target as HTMLSelectElement).value;
    const url = `https://devanbuggay.com/bspview/bsp/${value}`;
    loadMapFromUrl(url);
});

const bspInfo = new BspInfo(bottomElement);


function registerDragEvents() {
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    })

    function preventDefaults(event: Event) {
        event.preventDefault()
        event.stopPropagation()
    }

    // document.body.addEventListener("dragenter", handlerFunction, false);
    // document.body.addEventListener("dragleave", handlerFunction, false);
    // document.body.addEventListener("dragover", handlerFunction, false);
    document.body.addEventListener("drop", drop, false);

    function drop(event: DragEvent) {
        let dt = event.dataTransfer;
        let files = dt.files;
        const file = files[0];

        if (file) {
            (file as any).arrayBuffer().then((buffer: ArrayBuffer) => {
                loadMap(buffer);
            });
        }
        else {
            console.error("No file found!");
        }
    }
}

async function loadMapFromUrl(url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    loadMap(buffer);
}

async function loadMap(buffer: ArrayBuffer) {

    if (controls.controlsFocused) {
        console.warn("Map loaded while controls were focused");
        return;
    }

    const scene = new THREE.Scene();
    const light = new THREE.AmbientLight(0xFFFFFF, 1.0);
    scene.add(light);

    let lightSources = 0;

    // reset camera position
    camera.position.set(0, 0, 0);

    const bsp = parseBSP(buffer);
    bspInfo.update(bsp);

    // We are going to store each model's starting face here so not to render it as a normal face
    const modelFaces: { [key: number]: number } = {};
    const modelMeshes: Mesh[] = [];

    // Build materials
    const materials = bsp.textures.map((texture, index) => {

        const mip = texture.globalOffset + texture.offset1;
        const t = new Uint8Array(buffer.slice(mip, mip + (texture.width * texture.height)));

        const data = [];

        for (let i = 0; i < t.length; i++) {
            data.push(texture.palette[t[i]][0]);
            data.push(texture.palette[t[i]][1]);
            data.push(texture.palette[t[i]][2]);
        }

        const dataTexture = new THREE.DataTexture(new Uint8Array(data), texture.width, texture.height, THREE.RGBFormat);
        dataTexture.wrapS = dataTexture.wrapT = THREE.RepeatWrapping;
        return new THREE.MeshStandardMaterial({ map: dataTexture });
    });

    bsp.models.forEach((model, index) => {
        const depth = Math.abs(model.max[0] - model.min[0]);
        const width = Math.abs(model.max[1] - model.min[1]);
        const height = Math.abs(model.max[2] - model.min[2]);
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00aa11, wireframe: true }));
        mesh.position.set((model.max[1] + model.min[1]) / 2, (model.max[2] + model.min[2]) / 2, (model.max[0] + model.min[0]) / 2)
        mesh.visible = false;
        modelMeshes.push(mesh);
        scene.add(mesh);

        // Add to faceStarts
        if (index === 0) return; // Dont add first face model (is this true for all maps?)
        modelFaces[model.firstFace] = model.faces;
    });

    const nodes: Mesh[] = [];

    bsp.nodes.forEach(node => {

        const min = new Vector3(node.bbox[0].y, node.bbox[0].z, node.bbox[0].x);
        const max = new Vector3(node.bbox[1].y, node.bbox[1].z, node.bbox[1].x);
        const geometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
        mesh.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);

        mesh.visible = false;
        nodes.push(mesh);
        scene.add(mesh);

    });


    function getGeometryFromFace(faceIndex: number) {
        const geometry = new THREE.Geometry();
        const face = bsp.faces[faceIndex];

        if (face === undefined) return new THREE.Mesh();

        const texinfo = bsp.texInfo[face.textureInfo];
        const miptex = bsp.textures[texinfo.mipTex];

        const uvs = [];

        for (let i = 0; i < face.edges; i++) {

            const surfEdge = bsp.surfEdges[face.firstEdge + i];
            const edge = bsp.edges[Math.abs(surfEdge)];

            // We only need to care about the first vertex here, the second one will be duplicated in the next edge
            let v1 = bsp.vertices[edge[0]];

            // Unless surfEdge is negative, meaning it's the wrong way around. Flip it.
            if (surfEdge < 0) {
                v1 = bsp.vertices[edge[1]];
            }

            const vertex = new THREE.Vector3(v1.y, v1.z, v1.x);
            geometry.vertices.push(vertex);

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

        return new THREE.Mesh(geometry);
    }

    const faceMeshes: Mesh[] = [];

    // First model is always the parent level node
    const levelModel = bsp.models[0];
    const levelNodes = [bsp.nodes[levelModel.nodes[0]]];
    const levelLeaves = [];

    while (levelNodes.length > 0) {
        const n = levelNodes.pop();
        const front = n.front;
        const back = n.back;

        if (front < 0) {
            levelLeaves.push(Math.abs(front) - 1);
        }
        else {
            levelNodes.push(bsp.nodes[front])
        }

        if (back < 0) {
            levelLeaves.push(Math.abs(back) - 1);
        }
        else {
            levelNodes.push(bsp.nodes[back])
        }
    }

    const geom = new THREE.Geometry();

    const materialOrder: Material[] = [];
    let textureIndex = 0;

    levelLeaves.forEach(leafId => {
        const leaf = bsp.leaves[leafId];
        //const min = new Vector3(leaf.bbox[0].y, leaf.bbox[0].z, leaf.bbox[0].x);
        //const max = new Vector3(leaf.bbox[1].y, leaf.bbox[1].z, leaf.bbox[1].x);
        //const geometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z);
        //const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffaaff, wireframe: true }));
        //mesh.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2)

        //leaves.push(mesh);

        const faces: Mesh[] = [];

        for (let i = leaf.face; i < leaf.face + leaf.faces; i++) {
            let face = bsp.faces[i];
            const faceMesh = getGeometryFromFace(i);
            faces.push(faceMesh);
            materialOrder.push(faceMesh.material as Material);
            geom.merge(faceMesh.geometry as Geometry, faceMesh.matrix, bsp.texInfo[face.textureInfo].mipTex);
        }

    });

    const levelMesh = new THREE.Mesh(geom, materials);
    scene.add(levelMesh);

    function findLeaf(position: Vector3): number {

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

    //Entity representations
    const baseGeometry = new THREE.BufferGeometry().fromGeometry(new THREE.BoxGeometry(10, 10, 10))
    const entityGeos: any[] = [];

    bsp.entities.forEach(entity => {
        if (!entity.origin) return;
        const split = entity.origin.split(" ");
        const x = parseFloat(split[0]);
        const y = parseFloat(split[1]);
        const z = parseFloat(split[2]);

        switch (entity.classname) {
            case "light":
                if (lightSources < LIGHT_LIMIT) {
                    const light = new THREE.PointLight(0xffffff, .25, 400);
                    light.position.set(y, z, x);
                    scene.add(light);
                    lightSources++;
                }
                break;
            // case "info_player_start":

            //     break;
        }

        var geometry = baseGeometry.clone()
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(y, z, x));
        // then, we push this bufferGeometry instance in our array
        entityGeos.push(geometry)
    });

    const geometriesCubes = mergeBufferGeometries(entityGeos, false);
    const entityMesh = new THREE.Mesh(geometriesCubes, new THREE.MeshNormalMaterial());
    entityMesh.visible = false;
    scene.add(entityMesh);

    controls.movementSpeed = 300;
    controls.domElement = renderer.domElement;

    // Register hotkeys

    let viewMode = 0; // 0 - phong, 1 - normal, 2 - wireframe
    controls.registerHotkey(49, () => { // 1
        viewMode = (viewMode + 1) % 3;
        let material: THREE.Material = null;
        switch (viewMode) {
            case 0:
                material = new THREE.MeshPhongMaterial()
                break;
            case 1:
                material = new THREE.MeshNormalMaterial();
                break;
            case 2:
                material = new THREE.MeshBasicMaterial({ wireframe: true });
                break;
        }

        if (material === null) {
            material = new THREE.MeshBasicMaterial();
        }

        faceMeshes.forEach(face => {
            face.material = material;
            face.updateMatrix()
        });
    });

    controls.registerHotkey(50, () => { // 2
        modelMeshes.forEach(model => {
            model.visible = !model.visible;
        });
    });

    controls.registerHotkey(51, () => { // 3
        entityMesh.visible = !entityMesh.visible;
    });

    controls.registerHotkey(81, () => { // Q
        // Highlight center face
        raycaster.setFromCamera(new Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            const closestObject = intersects[0].object as THREE.Mesh;
            if (closestObject.geometry instanceof THREE.Geometry) {
                console.log(closestObject.geometry.faceVertexUvs);
            }
        }
    });

    controls.registerHotkey(220, () => {  // \
        controls.invertMouseY = !controls.invertMouseY;
    });

    // function hideMeshes() {
    //     leafFaceMeshes.forEach(leaf => {
    //         leaf.forEach(face => face.material = defaultMaterial);
    //     });
    //     nodes.forEach(node => node.visible = false);
    //     leaves.forEach(leaf => leaf.visible = false);
    // }

    function getVisibilityList(leafIndex: number): number[] {
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


    const render = function () {
        const delta = clock.getDelta();
        stats.begin();
        // hideMeshes();
        const leaf = findLeaf(camera.position);
        // const visibleLeaves = getVisibilityList(leaf);

        // visibleLeaves.forEach(leafIndex => {
        //     leafFaceMeshes[leafIndex].forEach(face => {
        //         face.material = activeMaterial;
        //     });
        // });

        renderer.render(scene, camera);
        stats.end();
        controls.update(delta);
        requestAnimationFrame(render);

    };

    render();
}

registerDragEvents();
loadMapFromUrl(`https://devanbuggay.com/bspview/bsp/${maps[0]}`);

