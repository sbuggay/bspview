import { parseBSP } from "./bsp";
import * as THREE from "three";

import * as Stats from "stats.js";
import { FlyControls } from "./FlyControls";
import { Controls, maps } from "./Controls";
import { BspInfo } from "./BspInfo";
import { mergeBufferGeometries } from "./utils";
import { Vector3, Face3 } from "three";

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
const controls = new FlyControls(camera, renderer.domElement);



renderer.setSize(window.innerWidth, window.innerHeight);

viewElement.appendChild(renderer.domElement);

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const controlElement = new Controls(topElement, (event) => {
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

    // const textureLoader = new THREE.TextureLoader();
    // const tex = textureLoader.load("https://images.unsplash.com/photo-1531481517150-2228446fb6b0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&w=1000&q=80");

    const scene = new THREE.Scene();

    const color = 0xCCCCCC;
    const intensity = 0.2;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);

    const near = 10;
    const far = 1000;
    scene.fog = new THREE.Fog(0x00000, near, far);

    // reset camera position
    camera.position.set(0, 0, 0);

    const bsp = parseBSP(buffer);
    bspInfo.update(bsp);

    // Triangulating BSP edges is very easy, edge reversal is already done before it reaches here.
    function triangulate(vertices: Vector3[]): THREE.Face3[] {
        vertices = vertices.reverse();

        if (vertices.length < 3) {
            return [];
        }

        const faces: THREE.Face3[] = [];
        for (let i = 1; i < vertices.length - 1; i++) {
            faces.push(new Face3(0, i, i + 1));
        }
        return faces;
    }

    // We are going to store each model's starting face here so not to render it as a normal face
    const modelFaces: { [key: number]: number } = {};

    bsp.models.forEach((model, index) => {
        const depth = Math.abs(model.max[0] - model.min[0]);
        const width = Math.abs(model.max[1] - model.min[1]);
        const height = Math.abs(model.max[2] - model.min[2]);
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00aa11, wireframe: true }));
        mesh.position.set((model.max[1] + model.min[1]) / 2, (model.max[2] + model.min[2]) / 2, (model.max[0] + model.min[0]) / 2)
        mesh.visible = false;
        scene.add(mesh);

        // Add to faceStarts
        if (index === 0) return; // Dont add total face model (is this true for all maps?)
        modelFaces[model.firstFace] = model.faces;
    });

    for (let faceIndex = 0; faceIndex < bsp.faces.length; faceIndex++) {

        if (modelFaces[faceIndex] > 0) {
            faceIndex += modelFaces[faceIndex] - 1;
            continue
        }

        const geometry = new THREE.Geometry();
        const face = bsp.faces[faceIndex];

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


        const texInfo = bsp.texInfo[face.textureInfo];
        const texture = bsp.textures[texInfo.mipTex];
        const mip = texture.globalOffset + texture.offset1;

        const t = new Uint8Array(buffer.slice(mip, mip + (texture.width * texture.height)));

        const data = [];

        for (let i = 0; i < t.length; i++) {
            data.push(t[i]);
            data.push(t[i]);
            data.push(t[i]);
        }

        const tex = new THREE.DataTexture(new Uint8Array(data), texture.width, texture.height, THREE.RGBFormat);

        function assignUVs(geometry: THREE.Geometry) {

            geometry.computeBoundingBox();

            var max = geometry.boundingBox.max,
                min = geometry.boundingBox.min;
            var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
            var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
            var faces = geometry.faces;

            geometry.faceVertexUvs[0] = [];

            for (var i = 0; i < faces.length; i++) {

                var v1 = geometry.vertices[faces[i].a],
                    v2 = geometry.vertices[faces[i].b],
                    v3 = geometry.vertices[faces[i].c];

                geometry.faceVertexUvs[0].push([
                    new THREE.Vector2((v1.x + offset.x) / range.x, (v1.y + offset.y) / range.y),
                    new THREE.Vector2((v2.x + offset.x) / range.x, (v2.y + offset.y) / range.y),
                    new THREE.Vector2((v3.x + offset.x) / range.x, (v3.y + offset.y) / range.y)
                ]);
            }
            geometry.uvsNeedUpdate = true;
        }
        geometry.faces = triangulate(geometry.vertices);

        assignUVs(geometry);

        let material = new THREE.MeshPhongMaterial({
            map: tex
        });
        geometry.computeFaceNormals();

        material.needsUpdate = true;
        geometry.uvsNeedUpdate = true;
        const mesh = new THREE.Mesh(geometry, material);

        scene.add(mesh);
    }

    // const entityMaterial = new THREE.MeshBasicMaterial({ color: 0x00aa11, wireframe: true });

    // Entity representations
    // var geo = new THREE.BufferGeometry().fromGeometry(new THREE.BoxGeometry(10, 10, 10))

    // const entityGeos: any[] = [];

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
    });

    // var geometriesCubes = mergeBufferGeometries(entityGeos, false);
    // var entityMesh = new THREE.Mesh(geometriesCubes, new THREE.MeshNormalMaterial());
    // scene.add(entityMesh);

    controls.movementSpeed = 500;
    controls.domElement = renderer.domElement;

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

