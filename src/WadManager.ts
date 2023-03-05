import { Wad } from "./Wad";
import { Texture } from "./Bsp";

export class WadManager {

    private wads: Map<string, Wad>;

    constructor() {
        this.wads = new Map<string, Wad>();
    }

    load(name: string, buffer: ArrayBuffer) {
        const wad = new Wad(buffer);

        console.log(`WAD Loaded: ${name}`);
        this.wads.set(name, wad);
    }

    remove(name: string) {
        this.wads.delete(name);
    }

    clear() {
        this.wads.clear();
    }

    getTextureData(texture: Texture): Uint8Array {

        const data = [];
        const isTransparant = (r: number, g: number, b: number) => (r === 0 && g === 0 && b === 255); // Build alphaMap. 0x0000FF means transparent
        let transparent = false;

        for (let i = 0; i < texture.pixels.length; i++) {
            const r = texture.palette[texture.pixels[i]][0];
            const g = texture.palette[texture.pixels[i]][1];
            const b = texture.palette[texture.pixels[i]][2];
            data.push(r, g, b);
            data.push(isTransparant(r, g, b) ? 0 : 255);

            // Set the transparency flag if it's ever hit.
            if (isTransparant(r, g, b) && !transparent) transparent = true;
        }

        return new Uint8Array(data);
    }

    getTexture(name: string) {
        // Loop over loaded wads until we find a texture with the same name

        for (const [name, wad] of this.wads) {
            if (wad.textures[name]) {
                return this.getTextureData(wad.textures[name]);
            }
        }

        console.warn(`Texture not found: ${name}`);

        return null;
    }
}