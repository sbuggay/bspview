# bspview

![Demo image](https://raw.githubusercontent.com/sbuggay/bspview/master/demo/demo.png)

bspview is a tool to view level wireframes and other metadata from maps in the Quake/GoldSrc format. 
You can see a live demo of this here: https://devanbuggay.com/bspview.

I've supplied a few BSP files to explore. You can select them from the dropdown.

Rendered with [three.js](https://threejs.org/).

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

- Face rendering
- Basic texturing support (if texture aren't from .WAD)
- Some basic lightmap support
- Adding Source engine support (https://developer.valvesoftware.com/wiki/Source_BSP_File_Format)

## Reference

- http://www.gamers.org/dEngine/quake/spec/quake-spec34/qkspec_4.htm
- http://hlbsp.sourceforge.net/index.php?content=bspdef
