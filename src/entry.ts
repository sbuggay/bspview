import { parseBSP } from "./bsp";
import * as THREE from "three";

import * as Stats from "stats.js";
import { Controls } from "./Controls";
import { DescriptionInfo, maps } from "./info/DescriptionInfo";
import { BspInfo } from "./info/BspInfo";
import { triangulate, mergeBufferGeometries } from "./utils";
import { Vector3, Face3, Mesh, Color, Quaternion, Vector2, Material } from "three";

const viewElement = document.body;
const dashboardElement = document.getElementById("dashboard");
const topElement = document.getElementById("top");
const bottomElement = document.getElementById("bottom");

var stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 10, 3000);
const renderer = new THREE.WebGLRenderer();
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

const textureLoader = new THREE.TextureLoader();
const tex = textureLoader.load("https://i.imgur.com/CslEXIS.jpg");


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

    const color = 0xCCCCCC;
    const intensity = 0.3;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);

    const near = 10;
    const far = 1000;
    scene.fog = new THREE.Fog(0x00000, near, far);

    // reset camera position
    camera.position.set(0, 0, 0);

    const bsp = parseBSP(buffer);
    bspInfo.update(bsp);

    // We are going to store each model's starting face here so not to render it as a normal face
    const modelFaces: { [key: number]: number } = {};
    const modelMeshes: Mesh[] = [];

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
        if (index === 0) return; // Dont add total face model (is this true for all maps?)
        modelFaces[model.firstFace] = model.faces;
    });

    const faceMeshes: Mesh[] = [];

    for (let faceIndex = 0; faceIndex < bsp.faces.length; faceIndex++) {

        if (modelFaces[faceIndex] > 0) {
            faceIndex += modelFaces[faceIndex] - 1;
            continue
        }

        const geometry = new THREE.Geometry();
        const face = bsp.faces[faceIndex];
        const plane = bsp.planes[face.plane];

        for (let i = 0; i < face.edges; i++) {

            const surfEdge = bsp.surfEdges[face.firstEdge + i];
            const edge = bsp.edges[Math.abs(surfEdge)];

            // We only need to care about the first vertex here, the second one will be duplicated in the next edge
            let v1 = bsp.vertices[edge[0]];

            // Unless surfEdge is negative, meaning it's the wrong way around. Flip it.
            if (surfEdge < 0) {
                v1 = bsp.vertices[edge[1]];
            }

            geometry.vertices.push(new THREE.Vector3(v1.y, v1.z, v1.x));
        }

        geometry.faces = triangulate(geometry.vertices);
        geometry.computeFaceNormals();

        // assignUVs(geometry);

        let material = new THREE.MeshPhongMaterial({
            // map: t1
        });

        const mesh = new THREE.Mesh(geometry, material);
        faceMeshes.push(mesh);
        scene.add(mesh);
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
                const light = new THREE.PointLight(0xffffff, .25, 400);
                light.position.set(y, z, x);
                scene.add(light);
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

    const render = function () {
        const delta = clock.getDelta();
        stats.begin();
        renderer.render(scene, camera);
        stats.end();
        controls.update(delta);
        requestAnimationFrame(render);
    };

    render();
}

registerDragEvents();
loadMapFromUrl(`https://devanbuggay.com/bspview/bsp/${maps[0]}`);

