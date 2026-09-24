// Tiny 7x7 UI glyphs: status chips, hearts, gold, crown. Outlined by compose().

import { compose } from './pixel.js';

export const GLYPHS = {
  fire: ['..f....', '..ff.f.', '.fyff..', '.fyyff.', 'fyhyff.', 'fyyyyf.', '.ffff..'],
  drop: ['...e...', '..eEe..', '.eleEe.', '.eeeEe.', 'eleeeEe', 'eeeeeEe', '.EEEEE.'],
  blood: ['...r...', '..rr...', '..rRr..', '.rNrRr.', '.rrrRr.', '..RRR..'],
  star: ['...y...', '..yhy..', 'yyyhyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'],
  flake: ['...c...', '.c.c.c.', '..ccc..', 'ccciccc', '..ccc..', '.c.c.c.', '...c...'],
  ice: ['..iii..', '.iccci.', 'icccCci', 'iccCCci', 'icCCCCi', '.iCCCi.', '..iii..'],
  down: ['..ppp..', '..ppp..', '..ppp..', 'ppppppp', '.ppppp.', '..ppp..', '...p...'],
  crack: ['sssssss', 'swss.ss', 'sws.sss', 'ss.s.ss', 's.sss.s', '.sssss.', '..sss..'],
  shield: ['ccccccc', 'ciccccC', 'ciccccC', 'ciccccC', '.cccCC.', '..cCC..', '...C...'],
  plus: ['..eee..', '..ele..', 'eeeleee', 'ellllle', 'eeeleee', '..ele..', '..eee..'],
  bolt: ['....nn.', '...nn..', '..nn...', '.nnnnn.', '...nn..', '..nn...', '.n.....'],
  heart: ['.rr.rr.', 'rNrrrrR', 'rrrrrrR', 'rrrrrRR', '.rrrRR.', '..rRR..', '...R...'],
  heartLost: ['.kk.kk.', 'kgkkkkk', 'kkkkkkk', 'kkkkkkk', '.kkkkk.', '..kkk..', '...k...'],
  coin: ['.yyyy.', 'yhyyyY', 'yhYyyY', 'yhYyyY', 'yyyyYY', '.YYYY.'],
  crown: ['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yrryrry', 'yyyyyyy', 'YYYYYYY'],
  swords: ['s.....s', '.s...s.', '..s.s..', '...s...', '..y.y..', '.b...b.', 'b.....b'],
  spark: ['.h...y.', '..h.y..', 'hhhyyyy', '..yhy..', '.y.y.h.', 'y..y..h', '...y...'],
  eye: ['.......', '.ppppp.', 'pwwPwwp', 'pwPPPwp', 'pwwPwwp', '.ppppp.', '.......'],
  hourglass: ['yyyyyyy', '.hyyyY.', '..hyY..', '...y...', '..hyY..', '.hyyyY.', 'yyyyyyy'],
  sword: ['......w', '.....ws', '....ws.', '.y.ws..', '..ys...', '.byy...', 'b..y...'],
  armor: ['ss...ss', 'swsssxs', 'swsssxs', '.swssx.', '.swssx.', '.sssxx.', '..xxx..'],
  ward: ['...y...', '..y.y..', '.ppppp.', 'pNpppPp', 'ppppppP', '.pppPP.', '..PPP..'],
  wing: ['......w', '....wws', '..wwwss', '.wwwss.', 'wwwss..', '.wss...', '..s....'],
  burst: ['f..f..f', '.fyfyf.', '.yhhhy.', 'ffhhhff', '.yhhhy.', '.fyfyf.', 'f..f..f'],
  thorn: ['e..e..e', '.eeEee.', '.eEEEe.', 'eEEEEEe', '.eEEEe.', '.eeEee.', 'e..e..e'],
  arrow: ['....w..', '....ww.', 'bbssssw', '....ww.', '....w..'],
  paw: ['.m.m.m.', '.m.m.m.', '.......', '..mmm..', '.mmmmm.', '.mmmmm.', '..m.m..'],
};

export const STATUS_GLYPH = {
  burn: 'fire', poison: 'drop', bleed: 'blood', stun: 'star', chill: 'flake', freeze: 'ice',
  weaken: 'down', sunder: 'crack', shield: 'shield', regen: 'plus', frenzy: 'bolt', thorns: 'crack',
  shock: 'spark', hex: 'eye', stasis: 'hourglass', overclock: 'bolt',
};

export function glyphGrid(name) {
  const rows = GLYPHS[name];
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  return compose(w, rows.length + 2, [{ rows, x: 1, y: 1 }]);
}
