# bspview

![Demo image 1](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo0.png)
![Demo image 2](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo1.png)
![Demo image 3](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo2.png)

bspview is a tool to view Quake/GoldSrc maps in your browser. 
You can see a live demo of this here: https://devanbuggay.com/bspview. I've supplied a few BSP files to explore that can be selected from the dropdown. However, you can also drag and drop any supported .bsp file onto the window to load it.

Rendered with [three.js](https://threejs.org/).

## Controls

- Click anywhere to lock the mouse pointer
- F - toggle fullscreen
- 1 - Cycle through mesh modes
- 2 - Toggle model volume visibility
- 3 - Toggle entity visibility
- Select a map from the dropdown to load it
- Drag and drop any supported .bsp on the window to load it

## Building

Building is simple, just install the dependencies and start it.

```
npm install
```

```
npm start
```

Right now the BSPs are hardcoded to being loaded from this GitHub repo though.

## Roadmap

- ~~Face rendering~~
- ~~Basic texturing support (if the textures aren't from .WAD)~~
- Basic lightmap support
- Implement the visibility system
- Source engine support (https://developer.valvesoftware.com/wiki/Source_BSP_File_Format)

## Reference

- http://www.gamers.org/dEngine/quake/spec/quake-spec34/qkspec_4.htm
- http://hlbsp.sourceforge.net/index.php?content=bspdef
