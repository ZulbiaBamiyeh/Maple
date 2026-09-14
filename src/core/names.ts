/** Period-correct handles. §7.3 asks for 50+; there are 78 here. */
export const HANDLES = [
  'xXDarkLordXx', 'BowMaster94', 'o0Angel0o', 'HoLyPaLaDiN', 'PinkBean4Life', 'Sn1per',
  'aznpride', 'NotAHacker', 'Meso_Farmer', 'GM_Sarah', 'iCantAim', 'LvL200', 'T3hPwnerer',
  'uwu', 'xXLegendXx', 'DarkSinX', 'ClericHeals', 'MapleGirl07', 'nubcake', 'PwnedU',
  'SleepyNinja', 'Orangemushy', 'iSlash', 'KerningKid', 'BlueSnail99', 'FMrat',
  'Dr_Pepper', 'lilkimchi', 'MesoKing', 'xXxSephirothxXx', 'HunterX', 'noobsaibot',
  'AznDragon', 'PurpleSheep', 'x_x_x', 'SpearmanJoe', 'HermitCrab', 'GoldRichie',
  'CrimsonBalrog', 'ilbi4sale', 'LeafreLover', 'MageOwnz', 'zzzsleep', 'SmegaSpammer',
  'PandaBoy', 'xLuNax', 'ScarLord', 'HennyC', 'DualBlade', 'VioletFlower',
  'iH4xU', 'WhiteAngel', 'ShadowStep', 'MapleSyrup', 'Ludibrium1', 'ElNath',
  'WarriorDude', 'JrBalrog', 'xXKaiserXx', 'SnowGirl', 'ThiefLord', 'Brigand',
  'CrossbowMan', 'PotionSeller', 'Papulatus', 'RushRush', 'zakumTT', 'ChiefOak',
  'BuffMePls', 'apqpq', 'Jr_Necki', 'MushmomHunter', 'sellingstuff', 'BuyingAll',
  'CoffeeBean', 'LuckySeven', 'KaedeCastle', 'HorntailX',
];

export function nameFor(index: number): string {
  return HANDLES[index % HANDLES.length];
}
