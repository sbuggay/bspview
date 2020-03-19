
interface TypeMapping {
    Float32: [number, (dataView: DataView, o: number) => number];
    Uint32: [number, (dataView: DataView, o: number) => number];
    Int32: [number, (dataView: DataView, o: number) => number];
    Uint16: [number, (dataView: DataView, o: number) => number];
    Uint8: [number, (dataView: DataView, o: number) => number];
}

export const typeMapping: TypeMapping = {
    Float32: [4, (dataView, o) => dataView.getFloat32(o, true)],
    Uint32: [4, (dataView, o) => dataView.getUint32(o, true)],
    Int32: [4, (dataView, o) => dataView.getInt32(o, true)],
    Uint16: [2, (dataView, o) => dataView.getUint16(o, true)],
    Uint8: [1, (dataView, o) => dataView.getUint8(o)]
}

export function extract(dataView: DataView, dataTypes: (keyof TypeMapping)[]) {
    const structSize = dataTypes.reduce((acc, v) => acc + typeMapping[v][0], 0);
    const output: any[] = [];
    for (let offset = 0; offset < dataView.byteLength; offset += structSize) {
        let struct: any[] = [];
        let o = offset;
        dataTypes.forEach(type => {
            const mapping = typeMapping[type];
            struct.push(mapping[1](dataView, o));
            o += mapping[0];
        });

        // If it's only length one, it's safe to assume we want a flattened buffer
        if (struct.length === 1) {
            struct = struct[0];
        }

        output.push(struct);
    }
    return output;
}
