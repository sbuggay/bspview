export const maps = [
    "c1a0.bsp",
    "c1a0a.bsp",
    "c1a0b.bsp",
    "c1a0c.bsp",
    "c1a0e.bsp",
    "c1a0e.bsp",
    "c1a1.bsp",
    "c1a1a.bsp",
    "c1a1b.bsp",
    "c1a1c.bsp",
    "c1a1d.bsp",
    "c1a1f.bsp",
]


export class MapSelector {

    select: HTMLSelectElement;

    constructor(element: HTMLElement, callback: ((evt: Event) => any)) {
        this.select = document.createElement("select");
        this.select.style.position = "absolute";
        this.select.style.top = "0";
        this.select.style.right = "0";
        this.select.style.width = "200px";
        this.select.style.fontSize = "1.5em";

        maps.forEach(map => {
            const option = document.createElement("option");
            option.text = map;
            this.select.add(option);
        });

        this.select.addEventListener("change", callback);

        element.appendChild(this.select);
    }

}