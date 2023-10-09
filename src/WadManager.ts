import { Wad } from "./Wad";
import { Texture } from "./Bsp";
import {
    DataTexture,
    RepeatWrapping,
    RGBAFormat,
    TextureLoader,
} from "three";
import { QuakeTexture } from "./QuakeTexture";

// eslint-disable-next-line
const missing = require("../docs/missing.png");

const developmentTexture = new TextureLoader().load(missing);
developmentTexture.wrapS = developmentTexture.wrapT = RepeatWrapping;

export class WadManager {
    private wads: Map<string, Wad>;
    private requiredWads: Record<string, boolean> = {};

    constructor() {
        this.wads = new Map<string, Wad>();
    }

    names() {
        return this.wads.keys;
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

    find(name: string) {
        // Loop over loaded wads until we find a texture with the same name

        for (const [_, wad] of this.wads) {
            const texture = wad.textures[name];
            if (texture) {
                const qt = this.data(texture);
                const dataTexture = new DataTexture(
                    qt.data(),
                    texture.width,
                    texture.height,
                    RGBAFormat
                );
                return dataTexture;
            }
        }

        console.warn(`Texture not found: ${name}`);

        return developmentTexture;
    }

    public setRequiredWads(wads: string[]) {
        this.requiredWads = {};

        wads.forEach(wad => {
            this.requiredWads[wad] = this.wads.has(wad);
        });
    }

    public wadState() {
        return this.requiredWads;
    }

    private data(texture: Texture): QuakeTexture {
        return new QuakeTexture(texture.palette, texture.pixels);
    }
}
