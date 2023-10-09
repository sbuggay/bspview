import { ListApi, Pane } from "tweakpane";
export class DescriptionInfo {
    public maps: string[] = [];
    public element: Pane;
    public detailsElement: HTMLElement;
    public select: ListApi<string>;
    private callback: ((map: string) => any);

    constructor(element: Pane, callback: (map: string) => any) {
        this.element = element;
        this.callback = callback;
    }

    async getMapList(dir: string) {
        const dec = new TextDecoder();
        const response = await fetch(dir);
        const buffer = await response.arrayBuffer();
        const rawHTML = dec.decode(buffer);

        var doc = document.createElement("html");
        doc.innerHTML = rawHTML;
        var links = doc.querySelectorAll("a[href$='.bsp']");

        for (const link of links) {
            this.maps.push(dir + link.getAttribute('href'));
        }

        return this.maps;
    }

    async renderMapList() {
        this.select = this.element.addBlade({
            view: "list",
            label: "map",
            options: this.maps.map((item) => {
                return {
                    text: item,
                    value: item
                }
            }),
            value: this.maps[0],
        }) as ListApi<string>;

        this.select.on('change', (ev) => this.callback(ev.value));

        this.element.add(this.select,1);
    }
}
