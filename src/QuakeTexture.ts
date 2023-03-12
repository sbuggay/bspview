import { Color } from "three";

export interface Texture {
    name: string;
    width: number;
    height: number;
    offset1: number;
    offset2: number;
    offset4: number;
    offset8: number;
    pixels?: Uint8Array;
    palette?: Color[];
    globalOffset?: number; // Offset into the file
}

export class QuakeTexture {

    private _transparent: boolean = false;

    constructor(
        private _palette: Color[],
        private _raw: Uint8Array
    ) {}

    public data() {
        const data = [];
        const isTransparant = (r: number, g: number, b: number) =>
            r === 0 && g === 0 && b === 255; // Build alphaMap. 0x0000FF means transparent

        for (let i = 0; i < this._raw.length; i++) {
            const r = this._palette[this._raw[i]].r;
            const g = this._palette[this._raw[i]].g;
            const b = this._palette[this._raw[i]].b;
            data.push(r, g, b);
            data.push(isTransparant(r, g, b) ? 0 : 255);

            // Set the transparency flag if it's ever hit.
            if (isTransparant(r, g, b) && !this._transparent) this._transparent = true;
        }

        return new Uint8Array(data);
    }

    public transparant() {
        return this._transparent;
    }
}
