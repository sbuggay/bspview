export const maps = [
    "halflife_c1a0.bsp",
    "halflife_c1a0a.bsp",
    "halflife_c1a0b.bsp",
    "halflife_c1a0c.bsp",
    "halflife_c1a0e.bsp",
    "halflife_c1a0e.bsp",
    "halflife_c1a1.bsp",
    "halflife_c1a1a.bsp",
    "halflife_c1a1b.bsp",
    "halflife_c1a1c.bsp",
    "halflife_c1a1d.bsp",
    "halflife_c1a1f.bsp",
]


export class MapSelector {

    public select: HTMLSelectElement;

    constructor(element: HTMLElement, callback: ((evt: Event) => any)) {
        this.select = document.createElement("select");
        this.select.style.position = "absolute";
        this.select.style.top = "0";
        this.select.style.right = "0";
        this.select.style.width = "300px";
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