const fs = require("fs");
const bson = require("bson");

const data = {};

const args = process.argv.slice(2);
const path = args[0] ? args[0] : ".";

function loadResources(path, extension) {
    console.log(path, extension);

    const data = {};

    const files = fs.readdirSync(path);

    files.forEach(file => {
        const filePath = `${path}/${file}`;
        if (fs.lstatSync(filePath).isDirectory()) return;
        if (!filePath.endsWith(extension)) return;
        data[file] = fs.readFileSync(filePath);
    });

    return data;
}

function parseParent(path) {
    console.log(`loading ${path}`);
    const data = {};
    
    // Load maps

    const mapPath = `${path}/maps`;

    if (fs.existsSync(`${path}/maps`)) {
        data.maps = loadResources(mapPath, ".bsp");
    }
    else {
        console.warn("no maps folder");
    }

    
    // Load wads


    return data;
}


const files = fs.readdirSync(path);

files.forEach(file => {

    if (file.startsWith(".")) {
        console.warn(`ignoring ${file}`);
        return;
    }

    if(fs.lstatSync(`${path}/${file}`).isDirectory()) {
        const parent = parseParent(`${path}/${file}`);
        data[file] = parent;
    }
});

bson.setInternalBufferSize(500000000);

const bsonData = bson.serialize(data);

console.log(bsonData);

console.log(bson.deserialize(bsonData));