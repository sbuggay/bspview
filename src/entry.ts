import * as THREE from "three";
import { CameraControls } from "./CameraControls";
import { WadManager } from "./WadManager";
import { ListApi, Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import { FpsGraphBladeApi } from "@tweakpane/plugin-essentials";
import { FilePicker } from "./FilePicker";
import { DragEvents } from "./DragEvents";
import { QuakeMap } from "./QuakeMap";
import { AmbientLight, BoxGeometry, CubeTextureLoader, Mesh, MeshBasicMaterial, MeshStandardMaterial, Scene } from "three";
import { DescriptionInfo } from "./info/DescriptionInfo";

THREE.ShaderLib[ 'lambert' ].fragmentShader = THREE.ShaderLib[ 'lambert' ].fragmentShader.replace(

    `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;`,

    `#ifndef CUSTOM
        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
    #else
        vec3 outgoingLight = diffuseColor.rgb * ( 1.0 - 0.5 * ( 1.0 - getShadowMask() ) ); // shadow intensity hardwired to 0.5 here
    #endif`

);

const LIGHT_LIMIT = 2048;
const NEAR_CLIPPING = 0.01;
const FAR_CLIPPING = 10000;

const viewElement = document.body;

const params = {
    entities: false,
    models: false,
};

const pane = new Pane();
pane.registerPlugin(EssentialsPlugin);

const descriptionInfo = new DescriptionInfo(pane, (map) => {
    loadMapFromURL(map);
});

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
        { text: "texture", "value": "texture" },
        { text: "phong", value: "phong" },
        { text: "normal", value: "normal" },
        { text: "wireframe", value: "wireframe" },
    ],
    value: "texture",
}) as ListApi<string>;

const wadFolder = pane.addFolder({
    title: "WADs",
});

const wadButton = wadFolder.addButton({
    title: "Load WAD",
});

const clearWadButton = wadFolder.addButton({
    title: "Clear WADs",
});

// const info = pane.addFolder({
//     title: "Info",
// });

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
const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
const controls = new CameraControls(camera, renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewElement.appendChild(renderer.domElement);

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const filePicker = new FilePicker();

fileButton.on("click", async () => {
    const file = await filePicker.activate();
    const buffer = await file.arrayBuffer();
    loadMap(buffer);
});

const wadManager = new WadManager();
const wads: string[] = [];
const dragEvents = new DragEvents(loadMap, wadManager);

wadButton.on("click", async () => {
    const file = await filePicker.activate();
    const buffer = await file.arrayBuffer();
    wadManager.load(file.name, buffer);
    console.log(wadManager.wadState());
});

async function loadWadFromUrl(url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Get filename and pass to loadWad
    const filename = url.slice(url.lastIndexOf("/") + 1);
    wadManager.load(filename, buffer);
}

async function loadMapFromURL(url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > 0) {
        loadMap(buffer);
    }
}

function checkMobileSupport() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        alert('bspview has very limited mobile support');
    }
}

checkMobileSupport();

async function loadMap(buffer: ArrayBuffer) {

    const scene = new Scene();
    const light = new AmbientLight(0xffffff, 0.1);
    scene.add(light);

    const map = new QuakeMap(buffer, wadManager);

    scene.add(map.mesh());

    let oldMat = map.mesh().material;

    // Register hotkeys

    materialBlade.on('change', (ev) => {
        let material: THREE.Material = null;

        switch (ev.value) {
            case 'texture':
            default:
                material = oldMat as THREE.Material;
                break;
            case 'phong':
                material = new THREE.MeshPhongMaterial()
                break;
            case 'normal':
                material = new THREE.MeshNormalMaterial();
                break;
            case 'wireframe':
                material = new THREE.MeshBasicMaterial({ wireframe: true });
                break;
        }

        map.mesh().material = material;
    });

    controls.registerHotkey(220, () => {
        controls.invertMouseY = !controls.invertMouseY;
    });

    // const level = bsp.models[0];

    let addedUniversalLight = false;
    let lightSources = 0;

    map.bspData().entities.forEach(entity => {
        if (!entity.origin) return;

        const split = entity.origin.split(" ");
        const x = parseFloat(split[0]);
        const y = parseFloat(split[1]);
        const z = parseFloat(split[2]);

        if (entity.classname.includes('light')) {
            function componentToHex(c: number): string {
                var hex = c.toString(16);
                return hex.length == 1 ? "0" + hex : hex;
            }
            function rgbToHex(r: number, g: number, b: number): number {
                return Number("0x" + componentToHex(r) + componentToHex(g) + componentToHex(b));
            }

            if (entity._light) {

                const split = entity._light.split(" ");
                let r = parseInt(split[0]);
                let g = parseInt(split[1]);
                let b = parseInt(split[2]);

                if (!g || !b) {
                    g = r;
                    b = r;
                }
                const luminosity = split[3] ? parseInt(split[3]) / 255 : 1;
                const radius = 1000;
                const lightColor = rgbToHex(r,g,b);

                switch (entity.classname) {
                    case "light_environment": {
                        if (!addedUniversalLight) {
                            const light = new THREE.AmbientLight(lightColor, 1.0);
                            scene.add(light);
                            addedUniversalLight = true;
                        }
                        break;
                    }
                    case "light": {
                        if (lightSources >= LIGHT_LIMIT) {
                            break;
                        }
                        if (parseInt(entity.spawnflags) == 1) {
                            break;
                        }
                        const light = new THREE.PointLight(lightColor, luminosity, radius);
                        light.position.set(y, z, x);
                        light.shadow.bias = - 0.004;
                        //light.castShadow = true;

                        scene.add(light);
                        lightSources++;
                        break;
                    }
                    case "light_spot": {
                        break;
                    }
                }
            }

            // Quake style light
            if (entity.light) {
                const light = new THREE.PointLight(0xFFFFFF, 0.25, parseInt(entity.light) * 4);
                light.position.set(y, z, x);
                scene.add(light);
                lightSources++;
            }
        }
    });

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

async function loadWads(dir: string) {
    const dec = new TextDecoder();
    const response = await fetch(dir);
    const buffer = await response.arrayBuffer();
    const rawHTML = dec.decode(buffer);

    var doc = document.createElement("html");
    doc.innerHTML = rawHTML;
    var links = doc.querySelectorAll("a[href$='.wad']");

    const promises: Promise<any>[] = [];
    for (const link of links) {
        promises.push(loadWadFromUrl(dir + link.getAttribute('href')));
    }

    return Promise.all(promises);
}

(async () => {
    const baseMapListPromise = descriptionInfo.getMapList(`/bsp/`);
    const baseLoadWadsPromise = loadWads('/wad/');

    const promises: Promise<any>[] = [baseMapListPromise, baseLoadWadsPromise];

    await Promise.all(promises);
    descriptionInfo.renderMapList();
    loadMapFromURL(descriptionInfo.maps[4]);

})();
