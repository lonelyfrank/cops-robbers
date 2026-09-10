import { createCityTile } from './cityTile.js';
import { getCurrentTile, getTileWindow, getTileRole } from './mapLayout.js';

/** Owns precisely three live districts and at most one dissolving old district. */
export class CityStream {
  constructor(scene,{reducedMotion=false,createTile=createCityTile}={}) {
    this.scene=scene;this.reducedMotion=reducedMotion;this.createTile=createTile;
    this.tiles=new Map();this.current=1;this.signals=new Map([[1,'yellow']]);
    this.caught=false;this.disposed=false;this.reset();
  }
  get activeTile(){return this.tiles.get(this.current)?.tile;}
  get previousTile(){return this.tiles.get(this.current-1)?.tile;}
  setSignal(n,state){this.signals.set(n,state);this.tiles.get(n)?.tile.setSignal(state);}
  setCaught(value){this.caught=Boolean(value);}
  setPlayerX(x){const next=getCurrentTile(x);if(next!==this.current)this.sync(next);}
  sync(current,immediate=false) {
    if(this.disposed)return;
    const wanted=new Set(getTileWindow(current));this.current=current;
    for(const index of wanted) {
      if(!this.tiles.has(index)) {
        const tile=this.createTile(index);const reveal=immediate||this.reducedMotion?1:0;
        tile.setSignal(this.signals.get(index)??'off');this.scene.add(tile.root);
        this.tiles.set(index,{tile,reveal,target:1});
      }
      const entry=this.tiles.get(index);entry.target=1;entry.tile.setRole(getTileRole(index,current));
      if(immediate){entry.reveal=1;entry.tile.warmth=index===current?1:0;}
    }
    for(const [index,entry] of this.tiles) if(!wanted.has(index)) {
      entry.target=0;entry.tile.setRole('retiring');
      if(immediate||this.reducedMotion){entry.tile.dispose();this.tiles.delete(index);}
    }
    // Even an interrupted transition or a large position jump cannot leak tiles.
    const retiring=[...this.tiles.entries()].filter(([,entry])=>entry.target===0).sort((a,b)=>Math.abs(a[0]-current)-Math.abs(b[0]-current));
    for(const [index,entry] of retiring.slice(1)){entry.tile.dispose();this.tiles.delete(index);}
    this.update(0);
  }
  update(dt) {
    if(this.disposed)return;
    for(const [index,entry] of this.tiles) {
      const speed=entry.target===1?1.9:1.7;
      const delta=this.reducedMotion?1:Math.max(0,dt)*speed;
      entry.reveal=entry.target===1?Math.min(1,entry.reveal+delta):Math.max(0,entry.reveal-delta);
      if(entry.target===0&&entry.reveal===0){entry.tile.dispose();this.tiles.delete(index);continue;}
      const eased=entry.reveal*entry.reveal*(3-2*entry.reveal);
      entry.tile.root.position.y=this.reducedMotion?0:(eased-1)*3.4;
      entry.tile.update(dt,eased,{reducedMotion:this.reducedMotion,caught:this.caught&&index===this.current});
    }
  }
  reset() {
    for(const {tile} of this.tiles.values())tile.dispose();this.tiles.clear();
    this.caught=false;this.signals.clear();this.signals.set(1,'yellow');this.sync(1,true);
  }
  dispose() {
    if(this.disposed)return;
    for(const {tile} of this.tiles.values())tile.dispose();this.tiles.clear();this.disposed=true;
  }
}
