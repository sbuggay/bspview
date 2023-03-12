/**
 * @author James Baicoianu / http://www.baicoianu.com/
 */

import * as THREE from "three";

const Vector3 = THREE.Vector3;
const Quaternion = THREE.Quaternion;

export class CameraControls {
    camera: THREE.Camera;
    domElement: HTMLCanvasElement;
    movementSpeed: number;
    rollSpeed: number;
    tmpQuaternion: any;

    moveState: any;
    moveVector: any;
    rotationVector: any;
    movementSpeedMultiplier: number;
    invertMouseY: boolean;

    _mousemove: any;
    _mousedown: any;
    _mouseup: any;
    _keydown: any;
    _keyup: any;

    hotkeys: { [key: number]: () => void };

    public controlsFocused: boolean;

    constructor(camera: THREE.Camera, domElement: HTMLCanvasElement) {
        this.camera = camera;
        this.domElement = domElement;
        if (domElement) this.domElement.setAttribute("tabindex", "-1    ");

        this.movementSpeed = 300;
        this.rollSpeed = 0.005;
        this.tmpQuaternion = new Quaternion();

        this.moveState = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            forward: 0,
            back: 0,
            pitchUp: 0,
            pitchDown: 0,
            yawLeft: 0,
            yawRight: 0,
            rollLeft: 0,
            rollRight: 0,
        };
        this.moveVector = new Vector3(0, 0, 0);
        this.rotationVector = new Vector3(0, 0, 0);
        this.movementSpeedMultiplier = 1;

        this._mousemove = this.bind(this, this.mousemove);
        this._mousedown = this.bind(this, this.mousedown);
        this._keydown = this.bind(this, this.keydown);
        this._keyup = this.bind(this, this.keyup);
        this.invertMouseY = false;

        this.hotkeys = {};

        this.domElement.addEventListener(
            "contextmenu",
            this.contextmenu,
            false
        );
        this.domElement.addEventListener("mousemove", this._mousemove, false);
        this.domElement.addEventListener("mousedown", this._mousedown, false);
        this.domElement.addEventListener("mouseup", this._mouseup, false);

        document.addEventListener(
            "pointerlockchange",
            lockChangeAlert.bind(this),
            false
        );
        document.addEventListener(
            "mozpointerlockerror",
            lockChangeAlert.bind(this),
            false
        );

        function lockChangeAlert() {
            if (document.pointerLockElement === this.domElement) {
                this.controlsFocused = true;
            } else {
                this.controlsFocused = false;
            }
        }

        window.addEventListener("keydown", this._keydown, false);
        window.addEventListener("keyup", this._keyup, false);

        this.updateMovementVector();

        this.controlsFocused = false;
    }

    keydown(event: any) {
        if (event.altKey) {
            return;
        }

        switch (event.keyCode) {
            case 16:
                /* shift */ this.movementSpeedMultiplier = 3;
                break;
            case 87:
                /*W*/ this.moveState.forward = 1;
                break;
            case 83:
                /*S*/ this.moveState.back = 1;
                break;
            case 65:
                /*A*/ this.moveState.left = 1;
                break;
            case 68:
                /*D*/ this.moveState.right = 1;
                break;
            case 70:
                /*F*/ this.toggleFullscreen();
                break;
        }

        if (this.hotkeys[event.keyCode]) {
            this.hotkeys[event.keyCode]();
        }

        this.updateMovementVector();

        event.preventDefault();
    }

    keyup(event: any) {
        switch (event.keyCode) {
            case 16:
                /* shift */ this.movementSpeedMultiplier = 1;
                break;
            case 87:
                /*W*/ this.moveState.forward = 0;
                break;
            case 83:
                /*S*/ this.moveState.back = 0;
                break;
            case 65:
                /*A*/ this.moveState.left = 0;
                break;
            case 68:
                /*D*/ this.moveState.right = 0;
                break;
        }

        this.updateMovementVector();

        event.preventDefault();
    }

    mousedown(event: any) {
        this.domElement.requestPointerLock();
        event.preventDefault();
        event.stopPropagation();
    }

    mousemove(event: any) {
        if (this.controlsFocused) {
            var xAxis = new THREE.Vector3(1, 0, 0);
            var yAxis = new THREE.Vector3(0, 1, 0);
            this.camera.rotateOnAxis(
                xAxis,
                event.movementY * -0.002 * (this.invertMouseY ? -1 : 1)
            );
            this.camera.rotateOnWorldAxis(yAxis, event.movementX * -0.002);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.domElement.requestPointerLock();
            this.domElement.requestFullscreen().catch((err) => {
                alert(
                    `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
                );
            });
        } else {
            document.exitFullscreen();
        }
    }

    registerHotkey(keyCode: number, callback: () => void) {
        this.hotkeys[keyCode] = callback;
    }

    update(delta: any) {
        var moveMult =
            delta * this.movementSpeed * this.movementSpeedMultiplier;
        var rotMult = delta * this.rollSpeed;

        this.camera.translateX(this.moveVector.x * moveMult);
        this.camera.translateY(this.moveVector.y * moveMult);
        this.camera.translateZ(this.moveVector.z * moveMult);

        this.tmpQuaternion
            .set(
                this.rotationVector.x * rotMult,
                this.rotationVector.y * rotMult,
                this.rotationVector.z * rotMult,
                1
            )
            .normalize();
        this.camera.quaternion.multiply(this.tmpQuaternion);

        // expose the rotation vector for convenience
        this.camera.rotation.setFromQuaternion(
            this.camera.quaternion,
            this.camera.rotation.order
        );
    }

    updateMovementVector() {
        var forward =
            this.moveState.forward || (false && !this.moveState.back) ? 1 : 0;

        this.moveVector.x = -this.moveState.left + this.moveState.right;
        this.moveVector.y = -this.moveState.down + this.moveState.up;
        this.moveVector.z = -forward + this.moveState.back;
    }

    bind(scope: any, fn: any) {
        return function () {
            fn.apply(scope, arguments);
        };
    }

    contextmenu(event: any) {
        event.preventDefault();
    }

    dispose() {
        this.domElement.removeEventListener(
            "contextmenu",
            this.contextmenu,
            false
        );
        this.domElement.removeEventListener(
            "mousedown",
            this._mousedown,
            false
        );
        this.domElement.removeEventListener(
            "mousemove",
            this._mousemove,
            false
        );

        window.removeEventListener("keydown", this._keydown, false);
        window.removeEventListener("keyup", this._keyup, false);
    }
}
