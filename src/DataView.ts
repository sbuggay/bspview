import { BSP } from "./bsp";

export class DataView {

    select: HTMLSelectElement;

    constructor(element: HTMLElement, bsp: BSP) {
        this.select = document.createElement("select");
        this.select.style.position = "absolute";
        this.select.style.top = "0";
        this.select.style.right = "0";
        this.select.style.width = "200px";
        this.select.style.fontSize = "1.5em";


        element.appendChild(this.select);
    }

}