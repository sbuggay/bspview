# bspview

![Demo image 0](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/inferno.png)
![Demo image 1](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo0.png)
![Demo image 2](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo1.png)
![Demo image 3](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo2.png)

bspview is a tool to view Quake/GoldSrc maps in your browser. 
You can see a live demo of this here: https://sbuggay.github.io/bspview. 

Rendered with [three.js](https://threejs.org/).

## Controls

- Click anywhere to lock the mouse pointer
- WASD - Move around
- Shift - "Sprint"
- F - toggle fullscreen

## Building

Building is simple, just install the dependencies and start it.

```
npm install
```

```
npm start
```

## Roadmap

- ~~Face rendering~~
- ~~Basic texturing support (if the textures aren't from .WAD)~~
- Basic lightmap support
- Implement the visibility system
- Source engine support (https://developer.valvesoftware.com/wiki/Source_BSP_File_Format)

## Reference

- http://www.gamers.org/dEngine/quake/spec/quake-spec34/qkspec_4.htm
- http://hlbsp.sourceforge.net/index.php?content=bspdef
