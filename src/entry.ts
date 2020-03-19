import { main } from "./webgl";
import { parseBSP } from "./bsp";
import * as THREE from "three";

import * as Stats from "stats.js";
import { FlyControls } from "./flyControls";


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();


fetch("/bsp/c1a0.bsp").then(async (response) => {
    const buffer = await response.arrayBuffer();
    const bsp = parseBSP(buffer);
    bsp.edges.forEach(edge => {
        var geometry = new THREE.Geometry();
        const v1 = bsp.vertices[edge[0]];
        const v2 = bsp.vertices[edge[1]];
        geometry.vertices.push(
            new THREE.Vector3(v1.x, v1.z, v1.y),
            new THREE.Vector3(v2.x, v2.z, v2.y),
        );
        var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        var seg = new THREE.LineSegments(geometry, material);
        scene.add(seg);
    });

    var stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);

    const controls = new FlyControls(camera, renderer.domElement);

    controls.movementSpeed = 1000;
    controls.domElement = renderer.domElement;
    controls.rollSpeed = Math.PI / 24;
    controls.autoForward = false;
    controls.dragToLook = false;


    const render = function () {
        var delta = clock.getDelta();

        stats.begin();
        renderer.render(scene, camera);
        stats.end();

        controls.update(delta);

        requestAnimationFrame(render);
    };

    render();


});

