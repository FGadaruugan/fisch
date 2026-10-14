import {ISLANDS,RODS} from './data.js';
import {levelProgress} from './progression.js';
import {AVATARS,money} from './ui/dom.js';
export function createLobby({root}) {
  const find=id=>root.querySelector('#'+id);
  return{
    renderHeader(state){
      const progress=levelProgress(state.totalXp),island=ISLANDS[state.lastIsland];
      find('playerName').textContent=state.profile.name;find('headerAvatar').textContent=AVATARS[state.profile.avatar]||AVATARS[0];
      find('playerLevel').textContent='LV. '+progress.level;find('coinCount').textContent=state.coins>=10000?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(state.coins):money(state.coins);find('coinCount').title=money(state.coins);
      find('headerXp').style.width=Math.round(progress.fraction*100)+'%';
      find('backpackCount').textContent=state.fish.length+' / 100';find('playDestination').textContent=island.name+' руу буцах';
      find('lobbyIslandName').textContent=island.name;find('lobbyIslandSubtitle').textContent=island.subtitle;
      find('islandName').textContent=island.name;find('rodName').textContent=RODS[state.equippedRod].name;
    },
    showPanel(mode){find('lobby').hidden=mode!=='lobby';find('playHud').hidden=mode!=='play';find('touchControls').hidden=mode!=='play';document.body.dataset.mode=mode;}
  };
}
