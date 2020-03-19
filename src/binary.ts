
interface TypeMapping {
    Float32: [number, (dataView: DataView) => Function];
    Uint32: [number, (dataView: DataView) => Function];
    Uint16: [number, (dataView: DataView) => Function];
    Uint8: [number, (dataView: DataView) => Function];
}

export const typeMapping: TypeMapping = {
    Float32: [4, (dataView: DataView) => dataView.getFloat32],
    Uint32: [4, (dataView: DataView) => dataView.getUint32],
    Uint16: [2, (dataView: DataView) => dataView.getUint16],
    Uint8: [1, (dataView: DataView) => dataView.getUint8]
}

export function extract(dataView: DataView, dataTypes: (keyof TypeMapping)[]) {
    const structSize = dataTypes.reduce((acc, v) => acc + typeMapping[v][0], 0);
    const output: any[] = [];
    for (let offset = 0; offset < dataView.byteLength; offset += structSize) {
        let o = offset;
        dataTypes.forEach(type => {
            const mapping = typeMapping[type];
            output.push(mapping[1](dataView)(o, true));
            o += mapping[0];
        });
    }
    return output;
}
