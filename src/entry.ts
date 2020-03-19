import { parseBSP } from "./bsp";
import * as THREE from "three";

import * as Stats from "stats.js";
import { FlyControls } from "./flyControls";


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const material = new THREE.MeshBasicMaterial({ color: 0xffffff });



fetch("/bsp/c1a0.bsp").then(async (response) => {
    const buffer = await response.arrayBuffer();
    const bsp = parseBSP(buffer);

    console.log(bsp.surfEdges);
    console.log(bsp.faces);


    bsp.faces.forEach(face => {
        
        let firstEdgeIndex = face.firstEdge;
        var geometry = new THREE.Geometry();

        for (let i = 0; i < face.edges; i++) {

            const surfEdge = bsp.surfEdges[firstEdgeIndex + i];
            
            if (bsp.edges[surfEdge] === undefined) continue;
            
            const v1 = bsp.vertices[bsp.edges[surfEdge][0]];
            const v2 = bsp.vertices[bsp.edges[surfEdge][1]];
            
            geometry.vertices.push(new THREE.Vector3(v1.x, v1.z, v1.y));
            geometry.vertices.push(new THREE.Vector3(v2.x, v2.z, v2.y));

        }

        const seg = new THREE.LineSegments(geometry, material);
        
        scene.add(seg);
    });

    // bsp.edges.forEach(edge => {
    //     var geometry = new THREE.Geometry();
    //     const v1 = bsp.vertices[edge[0]];
    //     const v2 = bsp.vertices[edge[1]];


    //     geometry.vertices.push(
    //         new THREE.Vector3(v1.x, v1.z, v1.y),
    //         new THREE.Vector3(v2.x, v2.z, v2.y),
    //     );
    //     const seg = new THREE.LineSegments(geometry, material);
    //     seg.matrixAutoUpdate = false
    //     scene.add(seg);
    // });

    var stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    const controls = new FlyControls(camera, renderer.domElement);

    controls.movementSpeed = 500;
    controls.domElement = renderer.domElement;

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

