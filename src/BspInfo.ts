import { BSP, Lump } from "./bsp";

const idMapping: { [key: number]: string } = {
    29: "Quake",
    30: "Half-Life"
}

export class BspInfo {

    element: HTMLDivElement;

    constructor(parent: HTMLElement) {
        this.element = document.createElement("div");
        this.element.style.padding = "5px";

        parent.appendChild(this.element);
    }

    addRow(left: string, right: string) {
        const div = document.createElement("div");
        div.className = "row";

        const leftElement = document.createElement("div");
        const rightElement = document.createElement("div");

        leftElement.innerText = left;
        rightElement.innerText = right;

        div.appendChild(leftElement);
        div.appendChild(rightElement);
        this.element.appendChild(div);
    }

    addText(data: string) {
        const div = document.createElement("div");
        div.className = "row";
        div.innerText = data;
        this.element.appendChild(div);
    }

    update(bsp: BSP) {
        this.element.innerHTML = "";
        this.addText(`${idMapping[bsp.header.id]} (BSP   id: ${bsp.header.id.toString()})`);

        this.addRow("Entities: ", bsp.entities.length.toString());
        this.addRow("Vertices: ", bsp.vertices.length.toString());
        this.addRow("Edges: ", bsp.edges.length.toString());
        this.addRow("Surfedges: ", bsp.surfEdges.length.toString());
        this.addRow("Faces: ", bsp.faces.length.toString());
        this.addRow("Planes: ", bsp.planes.length.toString());

    }

}