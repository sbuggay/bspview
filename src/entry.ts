import * as THREE from "three";
import { Controls } from "./Controls";
import { WadManager } from "./WadManager";
import { ListApi, Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import { FpsGraphBladeApi } from "@tweakpane/plugin-essentials";
import { FilePicker } from "./FilePicker";
import { DragEvents } from "./DragEvents";
import { QuakeMap } from "./QuakeMap";

const NEAR_CLIPPING = 0.01;
const FAR_CLIPPING = 10000;

const viewElement = document.body;

const params = {
    entities: false,
    models: false,
};

const pane = new Pane();
pane.registerPlugin(EssentialsPlugin);

const fileButton = pane.addButton({
    title: "Load Map",
});

// FPS graph
const fpsGraph = pane.addBlade({
    view: "fpsgraph",
    label: "fps",
}) as FpsGraphBladeApi;

const materialBlade = pane.addBlade({
    view: "list",
    label: "material",
    options: [
        { text: "phong", value: "phong" },
        { text: "normal", value: "normal" },
        { text: "wireframe", value: "wireframe" },
    ],
    value: "phong",
}) as ListApi<string>;

const modelInput = pane.addInput(params, "models");
const entitiesInput = pane.addInput(params, "entities");

const wadFolder = pane.addFolder({
    title: "WAD",
});

const wadButton = wadFolder.addButton({
    title: "Load WAD",
});

const clearWadButton = wadFolder.addButton({
    title: "Clear WADs",
});

const canvas = document.createElement("canvas");
const context = canvas.getContext("webgl2", { alpha: false });

const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    NEAR_CLIPPING,
    FAR_CLIPPING
);
const orthoCamera = new THREE.OrthographicCamera(
    0,
    0,
    0,
    0,
    NEAR_CLIPPING,
    FAR_CLIPPING
);
const renderer = new THREE.WebGLRenderer({ canvas, context });
const controls = new Controls(camera, renderer.domElement);
controls.movementSpeed = 300;
controls.domElement = renderer.domElement;

renderer.setSize(window.innerWidth, window.innerHeight);
viewElement.appendChild(renderer.domElement);

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
};

// const controlElement = new DescriptionInfo(topElement, (event) => {
//     const value = (event.target as HTMLSelectElement).value;
//     const url = `https://devanbuggay.com/bspview/bsp/${value}`;
//     loadMapFromUrl(url);
// });

// const bspInfo = new BspInfo(bottomElement);

const filePicker = new FilePicker();

fileButton.on("click", async () => {
    const file = await filePicker.activate();
    const buffer = await file.arrayBuffer();
    loadMap(buffer);
});

const wadManager = new WadManager();
const dragEvents = new DragEvents(loadMap, wadManager);

wadButton.on("click", async () => {
    const file = await filePicker.activate();
    const buffer = await file.arrayBuffer();
    wadManager.load(file.name, buffer);
});

async function loadMapFromURL(url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > 0) {
        loadMap(buffer);
    }
}

async function loadMap(buffer: ArrayBuffer) {
    const scene = new THREE.Scene();
    const light = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(light);

    const map = new QuakeMap(buffer, wadManager);
    scene.add(map.mesh());

    // Register hotkeys

    // materialBlade.on('change', (ev) => {
    //     let material: THREE.Material = null;
    //     switch (ev.value) {
    //         case 'phong':
    //         default:
    //             material = new THREE.MeshPhongMaterial()
    //             break;
    //         case 'normal':
    //             material = new THREE.MeshNormalMaterial();
    //             break;
    //         case 'wireframe':
    //             material = new THREE.MeshBasicMaterial({ wireframe: true });
    //             break;
    //     }

    //     mergedMesh.material = material;
    // });

    // modelInput.on('change', (ev) => {
    //     modelMeshes.forEach(model => {
    //         model.visible = !model.visible;
    //     });
    // });

    // entitiesInput.on('change', (ev) => {
    //     entityMesh.visible = ev.value;
    // });

    controls.registerHotkey(220, () => {
        // \
        controls.invertMouseY = !controls.invertMouseY;
    });

    // const level = bsp.models[0];

    const render = () => {
        const delta = clock.getDelta();

        fpsGraph.begin();

        renderer.render(scene, camera);

        fpsGraph.end();

        controls.update(delta);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
}
