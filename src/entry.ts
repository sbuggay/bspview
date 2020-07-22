import { parseBSP, Node, BSP, Face } from "./bsp";
import { parseWad } from "./wad";
import * as THREE from "three";
import * as Stats from "stats.js";
import { Controls } from "./controls";
import { DescriptionInfo, maps } from "./info/DescriptionInfo";
import { BspInfo } from "./info/BspInfo";
import { triangulate, mergeBufferGeometries, triangulateUV, findLeaf, isSpecialBrush } from "./utils";
import { Vector3, Face3, Mesh, Color, Quaternion, Vector2, Material, Box3, CameraHelper, Plane, Geometry, Matrix4 } from "three";
import { WadManager } from "./wadManager";

const LIGHT_LIMIT = 8;
const NEAR_CLIPPING = 0.1;
const FAR_CLIPPING = 6000;

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
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, NEAR_CLIPPING, FAR_CLIPPING);
const orthoCamera = new THREE.OrthographicCamera(0, 0, 0, 0, NEAR_CLIPPING, FAR_CLIPPING);
const renderer = new THREE.WebGLRenderer({ canvas, context });
const controls = new Controls(camera, renderer.domElement);
const raycaster = new THREE.Raycaster();

renderer.setSize(window.innerWidth, window.innerHeight);
viewElement.appendChild(renderer.domElement);

const wadManager = new WadManager();

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

    document.body.addEventListener("drop", drop, false);

    function drop(event: DragEvent) {
        let dt = event.dataTransfer;
        let files = dt.files;
        const file = files[0];

        // Parse name
        const format = file.name.slice(file.name.lastIndexOf(".") + 1);

        if (file) {
            switch (format) {
                case "bsp":
                    (file as any).arrayBuffer().then((buffer: ArrayBuffer) => {
                        loadMap(buffer);
                    });
                    break;
                case "wad":
                    (file as any).arrayBuffer().then((buffer: ArrayBuffer) => {
                        wadManager.loadWad(file.name, buffer);
                    });
                    break;
            }
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

    // Parse and update BSP
    const bsp = parseBSP(buffer);
    bspInfo.update(bsp);

    // We are going to store each model's starting face here so not to render it as a normal face
    const modelFaces: { [key: number]: number } = {};
    const modelMeshes: Mesh[] = [];

    var developmentTexture = new THREE.TextureLoader().load("https://tr.rbxcdn.com/7abbcef4149bbcf912ab31eb3e9bfcec/420/420/Decal/Png");

    // immediately use the texture for material creation
    var developmentMaterial = new THREE.MeshBasicMaterial({ map: developmentTexture });

    // Build materials
    const materials = bsp.textures.map((texture) => {

        // If offset is 0, texture is in WAD
        if (texture.offset1 === 0) {
            const data = wadManager.getTexture(texture.name);
            const dataTexture = new THREE.DataTexture(data, texture.width, texture.height, THREE.RGBAFormat);
            dataTexture.wrapS = dataTexture.wrapT = THREE.RepeatWrapping;
            const material = new THREE.MeshStandardMaterial({
                map: dataTexture
            });

            return material;
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

        const dataTexture = new THREE.DataTexture(new Uint8Array(data), texture.width, texture.height, THREE.RGBAFormat);
        dataTexture.wrapS = dataTexture.wrapT = THREE.RepeatWrapping;
        return new THREE.MeshStandardMaterial({
            map: dataTexture,
            transparent,
            vertexColors: true
        });
    });

    // Create model debug volumes
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

    function getGeometryFromFace(face: Face) {
        const geometry = new THREE.Geometry();

        if (face === undefined) return null;

        const texinfo = bsp.texInfo[face.textureInfo];
        const miptex = bsp.textures[texinfo.mipTex];
        const lighting = bsp.lighting[face.lightmapOffset / 3]; // Divided by 3 because the offset is in bytes

        if (isSpecialBrush(miptex)) {
            return null;
        }

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

            if (lighting) {
                geometry.colors.push(new THREE.Color(lighting[0], lighting[1], lighting[2]));
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

        const mesh = new THREE.Mesh(geometry);

        return mesh;
    }

    const faceMeshes: Mesh[] = [];

    // First model is always the parent level node
    const levelModel = bsp.models[0];
    const levelNodes = [bsp.nodes[levelModel.nodes[0]]];
    const levelLeaves: number[] = [];

    while (levelNodes.length > 0) {
        const n = levelNodes.pop();
        const front = n.front;
        const back = n.back;

        function parse(n: number) {
            // Ignore -1 leaves here, they are dummy leaves
            if (n < -1) {
                levelLeaves.push(Math.abs(n) - 1);
            }
            else if (n >= 0) {
                levelNodes.push(bsp.nodes[n])
            }
        }

        parse(front);
        parse(back);
    }

    const geom = new THREE.Geometry();

    const freq: { [key: number]: number } = {};

    levelLeaves.forEach(leafId => {
        const leaf = bsp.leaves[leafId];

        for (let faceOffset = 0; faceOffset < leaf.faces; faceOffset++) {
            const face = bsp.faces[leaf.face + faceOffset];
            if (!face) return;

            const faceMesh = getGeometryFromFace(face);

            if (faceMesh !== null) {
                geom.merge(faceMesh.geometry as Geometry, faceMesh.matrix, bsp.texInfo[face.textureInfo].mipTex);
            }
        }
    });

    scene.add(new THREE.Mesh(geom, materials));

    //Entity representations
    const baseGeometry = new THREE.BufferGeometry().fromGeometry(new THREE.SphereGeometry(5, 6, 6))
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

    const level = bsp.models[0];

    const render = function () {
        const delta = clock.getDelta();
        stats.begin();

        renderer.render(scene, camera);

        // const x = (level.max[1] + level.min[1]) / 2;
        // const y = (level.max[0] + level.min[0]) / 2;

        // const square = Math.max((level.max[1] - level.min[1]), (level.max[0], level.min[0])) * 0.75;

        // orthoCamera.left = -square + x;
        // orthoCamera.right = square + x;
        // orthoCamera.top = square - y;
        // orthoCamera.bottom = -square - y;
        // orthoCamera.lookAt(new Vector3(0, -1, 0));

        // orthoCamera.updateProjectionMatrix();

        // renderer.render(scene, orthoCamera);

        stats.end();
        controls.update(delta);
        requestAnimationFrame(render);
    };

    render();
}

registerDragEvents();
loadMapFromUrl(`https://devanbuggay.com/bspview/bsp/${maps[0]}`);

