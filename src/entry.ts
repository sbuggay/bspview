import { parseBSP } from "./bsp";
import * as THREE from "three";

import * as Stats from "stats.js";
import { FlyControls } from "./FlyControls";
import { MapSelector, maps } from "./MapSelector";

const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const mapSelector = new MapSelector(document.body, (event) => {
    const value = (event.target as HTMLSelectElement).value;
    const url = `https://devanbuggay.com/bspview/bsp/${value}`;
    loadMapFromUrl(url);
});

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

function loadMap(buffer: ArrayBuffer) {

    let scene = new THREE.Scene();

    const bsp = parseBSP(buffer);
    var geometry = new THREE.Geometry();

    bsp.faces.forEach((face) => {

        let firstEdgeIndex = face.firstEdge;

        for (let i = 0; i < face.edges; i++) {

            const surfEdge = bsp.surfEdges[firstEdgeIndex + i];
            const edge = bsp.edges[Math.abs(surfEdge)];

            let v1 = bsp.vertices[edge[0]];
            let v2 = bsp.vertices[edge[1]];

            geometry.vertices.push(new THREE.Vector3(v1.y, v1.z, v1.x));
            geometry.vertices.push(new THREE.Vector3(v2.y, v2.z, v2.x));

        }

        // if (firstVertex) {
        //     geometry.vertices.push(new THREE.Vector3(firstVertex.y, firstVertex.z, firstVertex.x));
        // }

        // const triangles = THREE.ShapeUtils.triangulateShape(geometry.vertices, []);

        // for (var i = 0; i < triangles.length; i++) {
        //     geometry.faces.push(new THREE.Face3(triangles[i][0], triangles[i][1], triangles[i][2]));
        // }

        // material.side = THREE.DoubleSide;

    });

    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.LineSegments(geometry, material);
    scene.add(mesh);


    var stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    const controls = new FlyControls(camera, renderer.domElement);

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

