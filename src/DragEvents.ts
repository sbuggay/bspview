import { WadManager } from "./WadManager";

export class DragEvents {

    constructor(loadMap: (_: ArrayBuffer) => void, wadManager: WadManager) {
        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
            document.body.addEventListener(eventName, this.preventDefaults, false);
        })

        document.body.addEventListener("drop", drop, false);

        async function drop(event: DragEvent) {
            const dt = event.dataTransfer;
            const files = dt.files;
            const file = files[0];

            if (!file) {
                throw new Error('No file found');
            }

            // Parse name
            const format = file.name.slice(file.name.lastIndexOf(".") + 1);
            const arrayBuffer = await file.arrayBuffer();

            switch (format) {
                case "bsp":
                    loadMap(arrayBuffer);
                    break;
                case "wad":
                    wadManager.load(file.name, arrayBuffer);
                    break;
            }
        }
    }

    private preventDefaults(event: Event): void {
        event.preventDefault()
        event.stopPropagation()
    }
}