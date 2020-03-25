export const maps = [
    "halflife_c1a0.bsp",
    "halflife_c1a0a.bsp",
    "halflife_c1a0b.bsp",
    "halflife_c1a0c.bsp",
    "halflife_c1a0d.bsp",
    "halflife_c1a0e.bsp",
    "de_dust.bsp",
    "de_dust2.bsp",
    "de_inferno.bsp",
    "de_cbble.bsp",
    "quake_start.bsp"
];

export class DescriptionInfo {

    public element: HTMLElement;
    public detailsElement: HTMLElement;
    public select: HTMLSelectElement;

    constructor(element: HTMLElement, callback: ((evt: Event) => any)) {
        this.element = element;
        this.select = document.createElement("select");
        this.select.style.width = "320px";
        this.select.style.fontSize = "1.5em";

        maps.forEach(map => {
            const option = document.createElement("option");
            option.text = map;
            this.select.add(option);
        });

        this.select.addEventListener("change", callback);

        element.appendChild(this.select);

        const detailsElement = document.createElement("div");
        detailsElement.className = "details";

        this.detailsElement = detailsElement;
        element.appendChild(this.detailsElement);

        // Build controls

        this.addText("Click anywhere to lock mouse pointer");
        this.addText("F - Toggle fullscreen");
        this.addText("1 - Cycle through mesh modes");
        this.addText("2 - Toggle model volume visibility");
        this.addText("3 - Toggle entity visibility");
        this.addText("Use the dropdown to change maps");
        this.addText("Drag and drop a .bsp to load it");

        const github = document.createElement("a");
        github.href = "https://github.com/sbuggay/bspview";
        github.innerText = "https://github.com/sbuggay/bspview";
        
        const githubDiv = document.createElement("div");
        githubDiv.appendChild(github);
        githubDiv.style.paddingTop = "20px";

        this.detailsElement.appendChild(githubDiv);
        
    }

    addText(data: string) {
        const div = document.createElement("div");
        div.className = "row";
        div.innerText = data;
        this.detailsElement.appendChild(div);
    }

}