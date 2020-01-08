import { bufferToHex, bufferToInt, fromSigned } from "ethereumjs-util";

import {
  CallMessageTrace,
  EvmMessageTrace,
  isCallTrace,
  isEvmStep,
  isPrecompileTrace,
  MessageTrace
} from "./message-trace";

const IntTy = "Int";
const UintTy = "Uint";
const BoolTy = "Bool";
const StringTy = "String";
const AddressTy = "Address";
const BytesTy = "Bytes";
const FixedBytesTy = "FixedBytes";

const M_SIZE = 32;

interface ConsoleLogArray extends Array<ConsoleLogEntry> {}

export type ConsoleLogEntry = boolean | string | ConsoleLogArray;

export type ConsoleLogs = ConsoleLogEntry[];

export class ConsoleLogger {
  private _consoleLogs: {
    [key: number]: string[];
  } = {};

  // In order to optimize map lookup
  // we'll store 4byte signature as int
  constructor() {
    this._consoleLogs[4163653873] = [UintTy];
    this._consoleLogs[1404955895] = [IntTy];
    this._consoleLogs[1093685164] = [StringTy];
    this._consoleLogs[843419373] = [BoolTy];
    this._consoleLogs[741264322] = [AddressTy];
    this._consoleLogs[2478884589] = [BytesTy];
    this._consoleLogs[2725141769] = [FixedBytesTy];
    this._consoleLogs[4133908826] = [UintTy, UintTy];
    this._consoleLogs[4040800206] = [UintTy, IntTy];
    this._consoleLogs[1681903839] = [UintTy, StringTy];
    this._consoleLogs[480083635] = [UintTy, BoolTy];
    this._consoleLogs[1764191366] = [UintTy, AddressTy];
    this._consoleLogs[348328170] = [UintTy, BytesTy];
    this._consoleLogs[644136574] = [UintTy, FixedBytesTy];
    this._consoleLogs[2615944376] = [IntTy, UintTy];
    this._consoleLogs[838036547] = [IntTy, IntTy];
    this._consoleLogs[2094990946] = [IntTy, StringTy];
    this._consoleLogs[1615965671] = [IntTy, BoolTy];
    this._consoleLogs[3217454654] = [IntTy, AddressTy];
    this._consoleLogs[600893559] = [IntTy, BytesTy];
    this._consoleLogs[880818129] = [IntTy, FixedBytesTy];
    this._consoleLogs[3054400204] = [StringTy, UintTy];
    this._consoleLogs[238210634] = [StringTy, IntTy];
    this._consoleLogs[1264337527] = [StringTy, StringTy];
    this._consoleLogs[3283441205] = [StringTy, BoolTy];
    this._consoleLogs[832238387] = [StringTy, AddressTy];
    this._consoleLogs[3674738960] = [StringTy, BytesTy];
    this._consoleLogs[1449502147] = [StringTy, FixedBytesTy];
    this._consoleLogs[965833939] = [BoolTy, UintTy];
    this._consoleLogs[2773571225] = [BoolTy, IntTy];
    this._consoleLogs[2414527781] = [BoolTy, StringTy];
    this._consoleLogs[705760899] = [BoolTy, BoolTy];
    this._consoleLogs[2235320393] = [BoolTy, AddressTy];
    this._consoleLogs[2513717360] = [BoolTy, BytesTy];
    this._consoleLogs[3678747399] = [BoolTy, FixedBytesTy];
    this._consoleLogs[2198464680] = [AddressTy, UintTy];
    this._consoleLogs[800587894] = [AddressTy, IntTy];
    this._consoleLogs[1973388987] = [AddressTy, StringTy];
    this._consoleLogs[1974863315] = [AddressTy, BoolTy];
    this._consoleLogs[3673216170] = [AddressTy, AddressTy];
    this._consoleLogs[1084744611] = [AddressTy, BytesTy];
    this._consoleLogs[157786173] = [AddressTy, FixedBytesTy];
    this._consoleLogs[715726877] = [BytesTy, UintTy];
    this._consoleLogs[1790813378] = [BytesTy, IntTy];
    this._consoleLogs[2695709925] = [BytesTy, StringTy];
    this._consoleLogs[1679893062] = [BytesTy, BoolTy];
    this._consoleLogs[4192635472] = [BytesTy, AddressTy];
    this._consoleLogs[697885689] = [BytesTy, BytesTy];
    this._consoleLogs[4263236043] = [BytesTy, FixedBytesTy];
    this._consoleLogs[2557154502] = [FixedBytesTy, UintTy];
    this._consoleLogs[1538976011] = [FixedBytesTy, IntTy];
    this._consoleLogs[3267259055] = [FixedBytesTy, StringTy];
    this._consoleLogs[1447280198] = [FixedBytesTy, BoolTy];
    this._consoleLogs[456277411] = [FixedBytesTy, AddressTy];
    this._consoleLogs[635049806] = [FixedBytesTy, BytesTy];
    this._consoleLogs[1246226602] = [FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3522001468] = [UintTy, UintTy, UintTy];
    this._consoleLogs[3179609112] = [UintTy, UintTy, IntTy];
    this._consoleLogs[1909476082] = [UintTy, UintTy, StringTy];
    this._consoleLogs[1197922930] = [UintTy, UintTy, BoolTy];
    this._consoleLogs[1553380145] = [UintTy, UintTy, AddressTy];
    this._consoleLogs[3699043501] = [UintTy, UintTy, BytesTy];
    this._consoleLogs[1370341489] = [UintTy, UintTy, FixedBytesTy];
    this._consoleLogs[1204574957] = [UintTy, IntTy, UintTy];
    this._consoleLogs[1711801147] = [UintTy, IntTy, IntTy];
    this._consoleLogs[3549129423] = [UintTy, IntTy, StringTy];
    this._consoleLogs[362057112] = [UintTy, IntTy, BoolTy];
    this._consoleLogs[1766164841] = [UintTy, IntTy, AddressTy];
    this._consoleLogs[2030334325] = [UintTy, IntTy, BytesTy];
    this._consoleLogs[2853671980] = [UintTy, IntTy, FixedBytesTy];
    this._consoleLogs[933920076] = [UintTy, StringTy, UintTy];
    this._consoleLogs[3563899782] = [UintTy, StringTy, IntTy];
    this._consoleLogs[2970968351] = [UintTy, StringTy, StringTy];
    this._consoleLogs[1290643290] = [UintTy, StringTy, BoolTy];
    this._consoleLogs[2063255897] = [UintTy, StringTy, AddressTy];
    this._consoleLogs[3322211071] = [UintTy, StringTy, BytesTy];
    this._consoleLogs[3379790227] = [UintTy, StringTy, FixedBytesTy];
    this._consoleLogs[537493524] = [UintTy, BoolTy, UintTy];
    this._consoleLogs[2777055316] = [UintTy, BoolTy, IntTy];
    this._consoleLogs[2239189025] = [UintTy, BoolTy, StringTy];
    this._consoleLogs[544310864] = [UintTy, BoolTy, BoolTy];
    this._consoleLogs[889741179] = [UintTy, BoolTy, AddressTy];
    this._consoleLogs[3658035554] = [UintTy, BoolTy, BytesTy];
    this._consoleLogs[3408202959] = [UintTy, BoolTy, FixedBytesTy];
    this._consoleLogs[1520131797] = [UintTy, AddressTy, UintTy];
    this._consoleLogs[3890156238] = [UintTy, AddressTy, IntTy];
    this._consoleLogs[1674265081] = [UintTy, AddressTy, StringTy];
    this._consoleLogs[2607726658] = [UintTy, AddressTy, BoolTy];
    this._consoleLogs[3170737120] = [UintTy, AddressTy, AddressTy];
    this._consoleLogs[706684132] = [UintTy, AddressTy, BytesTy];
    this._consoleLogs[1959275289] = [UintTy, AddressTy, FixedBytesTy];
    this._consoleLogs[2104797487] = [UintTy, BytesTy, UintTy];
    this._consoleLogs[225437278] = [UintTy, BytesTy, IntTy];
    this._consoleLogs[3272809403] = [UintTy, BytesTy, StringTy];
    this._consoleLogs[2577135705] = [UintTy, BytesTy, BoolTy];
    this._consoleLogs[4070616032] = [UintTy, BytesTy, AddressTy];
    this._consoleLogs[1089280929] = [UintTy, BytesTy, BytesTy];
    this._consoleLogs[2773805191] = [UintTy, BytesTy, FixedBytesTy];
    this._consoleLogs[2685878610] = [UintTy, FixedBytesTy, UintTy];
    this._consoleLogs[2956129866] = [UintTy, FixedBytesTy, IntTy];
    this._consoleLogs[3571305986] = [UintTy, FixedBytesTy, StringTy];
    this._consoleLogs[2967103972] = [UintTy, FixedBytesTy, BoolTy];
    this._consoleLogs[4200372474] = [UintTy, FixedBytesTy, AddressTy];
    this._consoleLogs[438986450] = [UintTy, FixedBytesTy, BytesTy];
    this._consoleLogs[3568922628] = [UintTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[2959797811] = [IntTy, UintTy, UintTy];
    this._consoleLogs[3936723254] = [IntTy, UintTy, IntTy];
    this._consoleLogs[974252669] = [IntTy, UintTy, StringTy];
    this._consoleLogs[1321648837] = [IntTy, UintTy, BoolTy];
    this._consoleLogs[3316300261] = [IntTy, UintTy, AddressTy];
    this._consoleLogs[1219779868] = [IntTy, UintTy, BytesTy];
    this._consoleLogs[3215978775] = [IntTy, UintTy, FixedBytesTy];
    this._consoleLogs[2272441836] = [IntTy, IntTy, UintTy];
    this._consoleLogs[2122308021] = [IntTy, IntTy, IntTy];
    this._consoleLogs[1884395056] = [IntTy, IntTy, StringTy];
    this._consoleLogs[1516926184] = [IntTy, IntTy, BoolTy];
    this._consoleLogs[3031192916] = [IntTy, IntTy, AddressTy];
    this._consoleLogs[1214586455] = [IntTy, IntTy, BytesTy];
    this._consoleLogs[996086021] = [IntTy, IntTy, FixedBytesTy];
    this._consoleLogs[2510416745] = [IntTy, StringTy, UintTy];
    this._consoleLogs[769036479] = [IntTy, StringTy, IntTy];
    this._consoleLogs[1160856157] = [IntTy, StringTy, StringTy];
    this._consoleLogs[3838362447] = [IntTy, StringTy, BoolTy];
    this._consoleLogs[47650936] = [IntTy, StringTy, AddressTy];
    this._consoleLogs[299789352] = [IntTy, StringTy, BytesTy];
    this._consoleLogs[559278099] = [IntTy, StringTy, FixedBytesTy];
    this._consoleLogs[3218595234] = [IntTy, BoolTy, UintTy];
    this._consoleLogs[3200869579] = [IntTy, BoolTy, IntTy];
    this._consoleLogs[282308489] = [IntTy, BoolTy, StringTy];
    this._consoleLogs[3642189855] = [IntTy, BoolTy, BoolTy];
    this._consoleLogs[1069985803] = [IntTy, BoolTy, AddressTy];
    this._consoleLogs[2103612891] = [IntTy, BoolTy, BytesTy];
    this._consoleLogs[169061903] = [IntTy, BoolTy, FixedBytesTy];
    this._consoleLogs[1027471463] = [IntTy, AddressTy, UintTy];
    this._consoleLogs[3517982774] = [IntTy, AddressTy, IntTy];
    this._consoleLogs[3967912626] = [IntTy, AddressTy, StringTy];
    this._consoleLogs[1099482400] = [IntTy, AddressTy, BoolTy];
    this._consoleLogs[4022643373] = [IntTy, AddressTy, AddressTy];
    this._consoleLogs[2951607927] = [IntTy, AddressTy, BytesTy];
    this._consoleLogs[1900301989] = [IntTy, AddressTy, FixedBytesTy];
    this._consoleLogs[281522190] = [IntTy, BytesTy, UintTy];
    this._consoleLogs[24402219] = [IntTy, BytesTy, IntTy];
    this._consoleLogs[4226996020] = [IntTy, BytesTy, StringTy];
    this._consoleLogs[3788727585] = [IntTy, BytesTy, BoolTy];
    this._consoleLogs[556250382] = [IntTy, BytesTy, AddressTy];
    this._consoleLogs[1218175531] = [IntTy, BytesTy, BytesTy];
    this._consoleLogs[1698553241] = [IntTy, BytesTy, FixedBytesTy];
    this._consoleLogs[3549650154] = [IntTy, FixedBytesTy, UintTy];
    this._consoleLogs[1387654668] = [IntTy, FixedBytesTy, IntTy];
    this._consoleLogs[3867467183] = [IntTy, FixedBytesTy, StringTy];
    this._consoleLogs[2725382049] = [IntTy, FixedBytesTy, BoolTy];
    this._consoleLogs[41786666] = [IntTy, FixedBytesTy, AddressTy];
    this._consoleLogs[133752852] = [IntTy, FixedBytesTy, BytesTy];
    this._consoleLogs[1066476040] = [IntTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3393701099] = [StringTy, UintTy, UintTy];
    this._consoleLogs[3643012468] = [StringTy, UintTy, IntTy];
    this._consoleLogs[1500569737] = [StringTy, UintTy, StringTy];
    this._consoleLogs[3396809649] = [StringTy, UintTy, BoolTy];
    this._consoleLogs[478069832] = [StringTy, UintTy, AddressTy];
    this._consoleLogs[3706712887] = [StringTy, UintTy, BytesTy];
    this._consoleLogs[4106599131] = [StringTy, UintTy, FixedBytesTy];
    this._consoleLogs[4287549209] = [StringTy, IntTy, UintTy];
    this._consoleLogs[4006891739] = [StringTy, IntTy, IntTy];
    this._consoleLogs[1703783587] = [StringTy, IntTy, StringTy];
    this._consoleLogs[2363366431] = [StringTy, IntTy, BoolTy];
    this._consoleLogs[3492085555] = [StringTy, IntTy, AddressTy];
    this._consoleLogs[459698504] = [StringTy, IntTy, BytesTy];
    this._consoleLogs[3981377654] = [StringTy, IntTy, FixedBytesTy];
    this._consoleLogs[1478619041] = [StringTy, StringTy, UintTy];
    this._consoleLogs[2572232255] = [StringTy, StringTy, IntTy];
    this._consoleLogs[753761519] = [StringTy, StringTy, StringTy];
    this._consoleLogs[2967534005] = [StringTy, StringTy, BoolTy];
    this._consoleLogs[2515337621] = [StringTy, StringTy, AddressTy];
    this._consoleLogs[3890773544] = [StringTy, StringTy, BytesTy];
    this._consoleLogs[620773128] = [StringTy, StringTy, FixedBytesTy];
    this._consoleLogs[3378075862] = [StringTy, BoolTy, UintTy];
    this._consoleLogs[1581685406] = [StringTy, BoolTy, IntTy];
    this._consoleLogs[3801674877] = [StringTy, BoolTy, StringTy];
    this._consoleLogs[2232122070] = [StringTy, BoolTy, BoolTy];
    this._consoleLogs[2469116728] = [StringTy, BoolTy, AddressTy];
    this._consoleLogs[1765900078] = [StringTy, BoolTy, BytesTy];
    this._consoleLogs[2037358665] = [StringTy, BoolTy, FixedBytesTy];
    this._consoleLogs[220641573] = [StringTy, AddressTy, UintTy];
    this._consoleLogs[2054143901] = [StringTy, AddressTy, IntTy];
    this._consoleLogs[3773410639] = [StringTy, AddressTy, StringTy];
    this._consoleLogs[3374145236] = [StringTy, AddressTy, BoolTy];
    this._consoleLogs[4243355104] = [StringTy, AddressTy, AddressTy];
    this._consoleLogs[2282824900] = [StringTy, AddressTy, BytesTy];
    this._consoleLogs[560479683] = [StringTy, AddressTy, FixedBytesTy];
    this._consoleLogs[1280892577] = [StringTy, BytesTy, UintTy];
    this._consoleLogs[4272009970] = [StringTy, BytesTy, IntTy];
    this._consoleLogs[3258716503] = [StringTy, BytesTy, StringTy];
    this._consoleLogs[3791012256] = [StringTy, BytesTy, BoolTy];
    this._consoleLogs[1028745898] = [StringTy, BytesTy, AddressTy];
    this._consoleLogs[2695269382] = [StringTy, BytesTy, BytesTy];
    this._consoleLogs[2856151903] = [StringTy, BytesTy, FixedBytesTy];
    this._consoleLogs[2811014805] = [StringTy, FixedBytesTy, UintTy];
    this._consoleLogs[3478310033] = [StringTy, FixedBytesTy, IntTy];
    this._consoleLogs[3454769108] = [StringTy, FixedBytesTy, StringTy];
    this._consoleLogs[487888848] = [StringTy, FixedBytesTy, BoolTy];
    this._consoleLogs[303812994] = [StringTy, FixedBytesTy, AddressTy];
    this._consoleLogs[3070716056] = [StringTy, FixedBytesTy, BytesTy];
    this._consoleLogs[3151800956] = [StringTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[923808615] = [BoolTy, UintTy, UintTy];
    this._consoleLogs[2514982710] = [BoolTy, UintTy, IntTy];
    this._consoleLogs[3288086896] = [BoolTy, UintTy, StringTy];
    this._consoleLogs[3906927529] = [BoolTy, UintTy, BoolTy];
    this._consoleLogs[143587794] = [BoolTy, UintTy, AddressTy];
    this._consoleLogs[3792204656] = [BoolTy, UintTy, BytesTy];
    this._consoleLogs[1739763880] = [BoolTy, UintTy, FixedBytesTy];
    this._consoleLogs[4029923729] = [BoolTy, IntTy, UintTy];
    this._consoleLogs[3035334439] = [BoolTy, IntTy, IntTy];
    this._consoleLogs[3718875934] = [BoolTy, IntTy, StringTy];
    this._consoleLogs[3022855249] = [BoolTy, IntTy, BoolTy];
    this._consoleLogs[3345111552] = [BoolTy, IntTy, AddressTy];
    this._consoleLogs[2326981774] = [BoolTy, IntTy, BytesTy];
    this._consoleLogs[3015061351] = [BoolTy, IntTy, FixedBytesTy];
    this._consoleLogs[278130193] = [BoolTy, StringTy, UintTy];
    this._consoleLogs[1055678668] = [BoolTy, StringTy, IntTy];
    this._consoleLogs[2960557183] = [BoolTy, StringTy, StringTy];
    this._consoleLogs[3686056519] = [BoolTy, StringTy, BoolTy];
    this._consoleLogs[2509355347] = [BoolTy, StringTy, AddressTy];
    this._consoleLogs[1452277576] = [BoolTy, StringTy, BytesTy];
    this._consoleLogs[960566694] = [BoolTy, StringTy, FixedBytesTy];
    this._consoleLogs[317855234] = [BoolTy, BoolTy, UintTy];
    this._consoleLogs[639845068] = [BoolTy, BoolTy, IntTy];
    this._consoleLogs[626391622] = [BoolTy, BoolTy, StringTy];
    this._consoleLogs[1349555864] = [BoolTy, BoolTy, BoolTy];
    this._consoleLogs[276362893] = [BoolTy, BoolTy, AddressTy];
    this._consoleLogs[1741006123] = [BoolTy, BoolTy, BytesTy];
    this._consoleLogs[1117591627] = [BoolTy, BoolTy, FixedBytesTy];
    this._consoleLogs[1601936123] = [BoolTy, AddressTy, UintTy];
    this._consoleLogs[2373567735] = [BoolTy, AddressTy, IntTy];
    this._consoleLogs[3734671984] = [BoolTy, AddressTy, StringTy];
    this._consoleLogs[415876934] = [BoolTy, AddressTy, BoolTy];
    this._consoleLogs[3530962535] = [BoolTy, AddressTy, AddressTy];
    this._consoleLogs[1357649043] = [BoolTy, AddressTy, BytesTy];
    this._consoleLogs[3911586434] = [BoolTy, AddressTy, FixedBytesTy];
    this._consoleLogs[2284838390] = [BoolTy, BytesTy, UintTy];
    this._consoleLogs[2107708185] = [BoolTy, BytesTy, IntTy];
    this._consoleLogs[1227795476] = [BoolTy, BytesTy, StringTy];
    this._consoleLogs[576283221] = [BoolTy, BytesTy, BoolTy];
    this._consoleLogs[664125170] = [BoolTy, BytesTy, AddressTy];
    this._consoleLogs[2166325420] = [BoolTy, BytesTy, BytesTy];
    this._consoleLogs[506444641] = [BoolTy, BytesTy, FixedBytesTy];
    this._consoleLogs[17324411] = [BoolTy, FixedBytesTy, UintTy];
    this._consoleLogs[1623267122] = [BoolTy, FixedBytesTy, IntTy];
    this._consoleLogs[1860891549] = [BoolTy, FixedBytesTy, StringTy];
    this._consoleLogs[3562616024] = [BoolTy, FixedBytesTy, BoolTy];
    this._consoleLogs[3129628388] = [BoolTy, FixedBytesTy, AddressTy];
    this._consoleLogs[651535726] = [BoolTy, FixedBytesTy, BytesTy];
    this._consoleLogs[4163627393] = [BoolTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3063663350] = [AddressTy, UintTy, UintTy];
    this._consoleLogs[2710604533] = [AddressTy, UintTy, IntTy];
    this._consoleLogs[2717051050] = [AddressTy, UintTy, StringTy];
    this._consoleLogs[1736575400] = [AddressTy, UintTy, BoolTy];
    this._consoleLogs[2076235848] = [AddressTy, UintTy, AddressTy];
    this._consoleLogs[709021190] = [AddressTy, UintTy, BytesTy];
    this._consoleLogs[629901382] = [AddressTy, UintTy, FixedBytesTy];
    this._consoleLogs[1134999193] = [AddressTy, IntTy, UintTy];
    this._consoleLogs[2848450085] = [AddressTy, IntTy, IntTy];
    this._consoleLogs[3168454978] = [AddressTy, IntTy, StringTy];
    this._consoleLogs[2293320146] = [AddressTy, IntTy, BoolTy];
    this._consoleLogs[636130260] = [AddressTy, IntTy, AddressTy];
    this._consoleLogs[1695838737] = [AddressTy, IntTy, BytesTy];
    this._consoleLogs[1925688554] = [AddressTy, IntTy, FixedBytesTy];
    this._consoleLogs[1742565361] = [AddressTy, StringTy, UintTy];
    this._consoleLogs[3465097884] = [AddressTy, StringTy, IntTy];
    this._consoleLogs[4218888805] = [AddressTy, StringTy, StringTy];
    this._consoleLogs[3473018801] = [AddressTy, StringTy, BoolTy];
    this._consoleLogs[4035396840] = [AddressTy, StringTy, AddressTy];
    this._consoleLogs[1075722608] = [AddressTy, StringTy, BytesTy];
    this._consoleLogs[3312181084] = [AddressTy, StringTy, FixedBytesTy];
    this._consoleLogs[2622462459] = [AddressTy, BoolTy, UintTy];
    this._consoleLogs[266999084] = [AddressTy, BoolTy, IntTy];
    this._consoleLogs[555898316] = [AddressTy, BoolTy, StringTy];
    this._consoleLogs[3951234194] = [AddressTy, BoolTy, BoolTy];
    this._consoleLogs[4044790253] = [AddressTy, BoolTy, AddressTy];
    this._consoleLogs[457263717] = [AddressTy, BoolTy, BytesTy];
    this._consoleLogs[412204341] = [AddressTy, BoolTy, FixedBytesTy];
    this._consoleLogs[402547077] = [AddressTy, AddressTy, UintTy];
    this._consoleLogs[239196485] = [AddressTy, AddressTy, IntTy];
    this._consoleLogs[7426238] = [AddressTy, AddressTy, StringTy];
    this._consoleLogs[4070990470] = [AddressTy, AddressTy, BoolTy];
    this._consoleLogs[25986242] = [AddressTy, AddressTy, AddressTy];
    this._consoleLogs[1225552275] = [AddressTy, AddressTy, BytesTy];
    this._consoleLogs[1476159680] = [AddressTy, AddressTy, FixedBytesTy];
    this._consoleLogs[2300199976] = [AddressTy, BytesTy, UintTy];
    this._consoleLogs[2558527139] = [AddressTy, BytesTy, IntTy];
    this._consoleLogs[4065372074] = [AddressTy, BytesTy, StringTy];
    this._consoleLogs[3895571573] = [AddressTy, BytesTy, BoolTy];
    this._consoleLogs[619583491] = [AddressTy, BytesTy, AddressTy];
    this._consoleLogs[2418043501] = [AddressTy, BytesTy, BytesTy];
    this._consoleLogs[4069715990] = [AddressTy, BytesTy, FixedBytesTy];
    this._consoleLogs[4182550303] = [AddressTy, FixedBytesTy, UintTy];
    this._consoleLogs[2755250274] = [AddressTy, FixedBytesTy, IntTy];
    this._consoleLogs[3809796014] = [AddressTy, FixedBytesTy, StringTy];
    this._consoleLogs[1164872071] = [AddressTy, FixedBytesTy, BoolTy];
    this._consoleLogs[62931019] = [AddressTy, FixedBytesTy, AddressTy];
    this._consoleLogs[1324889570] = [AddressTy, FixedBytesTy, BytesTy];
    this._consoleLogs[1771501257] = [AddressTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[1925676762] = [BytesTy, UintTy, UintTy];
    this._consoleLogs[2563304764] = [BytesTy, UintTy, IntTy];
    this._consoleLogs[354649961] = [BytesTy, UintTy, StringTy];
    this._consoleLogs[945860763] = [BytesTy, UintTy, BoolTy];
    this._consoleLogs[352834351] = [BytesTy, UintTy, AddressTy];
    this._consoleLogs[2196387095] = [BytesTy, UintTy, BytesTy];
    this._consoleLogs[3228245634] = [BytesTy, UintTy, FixedBytesTy];
    this._consoleLogs[1082201561] = [BytesTy, IntTy, UintTy];
    this._consoleLogs[1498969267] = [BytesTy, IntTy, IntTy];
    this._consoleLogs[3690722815] = [BytesTy, IntTy, StringTy];
    this._consoleLogs[3837918660] = [BytesTy, IntTy, BoolTy];
    this._consoleLogs[2023187592] = [BytesTy, IntTy, AddressTy];
    this._consoleLogs[1475186833] = [BytesTy, IntTy, BytesTy];
    this._consoleLogs[3046693052] = [BytesTy, IntTy, FixedBytesTy];
    this._consoleLogs[2971517139] = [BytesTy, StringTy, UintTy];
    this._consoleLogs[1633741273] = [BytesTy, StringTy, IntTy];
    this._consoleLogs[60984745] = [BytesTy, StringTy, StringTy];
    this._consoleLogs[2837595298] = [BytesTy, StringTy, BoolTy];
    this._consoleLogs[2054644808] = [BytesTy, StringTy, AddressTy];
    this._consoleLogs[938201691] = [BytesTy, StringTy, BytesTy];
    this._consoleLogs[3042983314] = [BytesTy, StringTy, FixedBytesTy];
    this._consoleLogs[456273297] = [BytesTy, BoolTy, UintTy];
    this._consoleLogs[4223983238] = [BytesTy, BoolTy, IntTy];
    this._consoleLogs[57837815] = [BytesTy, BoolTy, StringTy];
    this._consoleLogs[2937889597] = [BytesTy, BoolTy, BoolTy];
    this._consoleLogs[1930849408] = [BytesTy, BoolTy, AddressTy];
    this._consoleLogs[204012166] = [BytesTy, BoolTy, BytesTy];
    this._consoleLogs[1399005531] = [BytesTy, BoolTy, FixedBytesTy];
    this._consoleLogs[4114391865] = [BytesTy, AddressTy, UintTy];
    this._consoleLogs[3886259048] = [BytesTy, AddressTy, IntTy];
    this._consoleLogs[2483879139] = [BytesTy, AddressTy, StringTy];
    this._consoleLogs[4023174278] = [BytesTy, AddressTy, BoolTy];
    this._consoleLogs[3708142605] = [BytesTy, AddressTy, AddressTy];
    this._consoleLogs[2277440355] = [BytesTy, AddressTy, BytesTy];
    this._consoleLogs[3728993913] = [BytesTy, AddressTy, FixedBytesTy];
    this._consoleLogs[3026291815] = [BytesTy, BytesTy, UintTy];
    this._consoleLogs[1799084055] = [BytesTy, BytesTy, IntTy];
    this._consoleLogs[1176221125] = [BytesTy, BytesTy, StringTy];
    this._consoleLogs[3525776588] = [BytesTy, BytesTy, BoolTy];
    this._consoleLogs[2241290573] = [BytesTy, BytesTy, AddressTy];
    this._consoleLogs[2134857023] = [BytesTy, BytesTy, BytesTy];
    this._consoleLogs[3414080479] = [BytesTy, BytesTy, FixedBytesTy];
    this._consoleLogs[342030827] = [BytesTy, FixedBytesTy, UintTy];
    this._consoleLogs[224683963] = [BytesTy, FixedBytesTy, IntTy];
    this._consoleLogs[3385203502] = [BytesTy, FixedBytesTy, StringTy];
    this._consoleLogs[2117842904] = [BytesTy, FixedBytesTy, BoolTy];
    this._consoleLogs[1432924141] = [BytesTy, FixedBytesTy, AddressTy];
    this._consoleLogs[3490230732] = [BytesTy, FixedBytesTy, BytesTy];
    this._consoleLogs[4060619247] = [BytesTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3032600628] = [FixedBytesTy, UintTy, UintTy];
    this._consoleLogs[2651529038] = [FixedBytesTy, UintTy, IntTy];
    this._consoleLogs[1918195575] = [FixedBytesTy, UintTy, StringTy];
    this._consoleLogs[477040237] = [FixedBytesTy, UintTy, BoolTy];
    this._consoleLogs[2151163681] = [FixedBytesTy, UintTy, AddressTy];
    this._consoleLogs[3046623942] = [FixedBytesTy, UintTy, BytesTy];
    this._consoleLogs[769957641] = [FixedBytesTy, UintTy, FixedBytesTy];
    this._consoleLogs[2253280327] = [FixedBytesTy, IntTy, UintTy];
    this._consoleLogs[2666027769] = [FixedBytesTy, IntTy, IntTy];
    this._consoleLogs[3979841003] = [FixedBytesTy, IntTy, StringTy];
    this._consoleLogs[2510671682] = [FixedBytesTy, IntTy, BoolTy];
    this._consoleLogs[2299493429] = [FixedBytesTy, IntTy, AddressTy];
    this._consoleLogs[3898908587] = [FixedBytesTy, IntTy, BytesTy];
    this._consoleLogs[846005815] = [FixedBytesTy, IntTy, FixedBytesTy];
    this._consoleLogs[1016736430] = [FixedBytesTy, StringTy, UintTy];
    this._consoleLogs[1815617225] = [FixedBytesTy, StringTy, IntTy];
    this._consoleLogs[334057222] = [FixedBytesTy, StringTy, StringTy];
    this._consoleLogs[146785611] = [FixedBytesTy, StringTy, BoolTy];
    this._consoleLogs[723701760] = [FixedBytesTy, StringTy, AddressTy];
    this._consoleLogs[3444126083] = [FixedBytesTy, StringTy, BytesTy];
    this._consoleLogs[1470771279] = [FixedBytesTy, StringTy, FixedBytesTy];
    this._consoleLogs[1242542992] = [FixedBytesTy, BoolTy, UintTy];
    this._consoleLogs[93681849] = [FixedBytesTy, BoolTy, IntTy];
    this._consoleLogs[3256055087] = [FixedBytesTy, BoolTy, StringTy];
    this._consoleLogs[4020146794] = [FixedBytesTy, BoolTy, BoolTy];
    this._consoleLogs[1096183505] = [FixedBytesTy, BoolTy, AddressTy];
    this._consoleLogs[924956385] = [FixedBytesTy, BoolTy, BytesTy];
    this._consoleLogs[714392455] = [FixedBytesTy, BoolTy, FixedBytesTy];
    this._consoleLogs[2021350168] = [FixedBytesTy, AddressTy, UintTy];
    this._consoleLogs[85136290] = [FixedBytesTy, AddressTy, IntTy];
    this._consoleLogs[1901213444] = [FixedBytesTy, AddressTy, StringTy];
    this._consoleLogs[2371350819] = [FixedBytesTy, AddressTy, BoolTy];
    this._consoleLogs[550436586] = [FixedBytesTy, AddressTy, AddressTy];
    this._consoleLogs[2793885916] = [FixedBytesTy, AddressTy, BytesTy];
    this._consoleLogs[4054116918] = [FixedBytesTy, AddressTy, FixedBytesTy];
    this._consoleLogs[3894930560] = [FixedBytesTy, BytesTy, UintTy];
    this._consoleLogs[367662875] = [FixedBytesTy, BytesTy, IntTy];
    this._consoleLogs[3317480599] = [FixedBytesTy, BytesTy, StringTy];
    this._consoleLogs[122556927] = [FixedBytesTy, BytesTy, BoolTy];
    this._consoleLogs[1897321673] = [FixedBytesTy, BytesTy, AddressTy];
    this._consoleLogs[119480376] = [FixedBytesTy, BytesTy, BytesTy];
    this._consoleLogs[2957993936] = [FixedBytesTy, BytesTy, FixedBytesTy];
    this._consoleLogs[4210709931] = [FixedBytesTy, FixedBytesTy, UintTy];
    this._consoleLogs[1832932773] = [FixedBytesTy, FixedBytesTy, IntTy];
    this._consoleLogs[2461767813] = [FixedBytesTy, FixedBytesTy, StringTy];
    this._consoleLogs[1214758057] = [FixedBytesTy, FixedBytesTy, BoolTy];
    this._consoleLogs[3409072533] = [FixedBytesTy, FixedBytesTy, AddressTy];
    this._consoleLogs[4281371082] = [FixedBytesTy, FixedBytesTy, BytesTy];
    this._consoleLogs[602294046] = [FixedBytesTy, FixedBytesTy, FixedBytesTy];
  }

  public printLogs(maybeDecodedMessageTrace: MessageTrace) {
    if (isPrecompileTrace(maybeDecodedMessageTrace)) {
      return;
    }

    const logs = this.getExecutionLogs(maybeDecodedMessageTrace);
    for (const log of logs) {
      console.log(...log);
    }
  }

  public getExecutionLogs(
    maybeDecodedMessageTrace: EvmMessageTrace
  ): ConsoleLogs[] {
    const logs: ConsoleLogs[] = [];
    this._collectExecutionLogs(maybeDecodedMessageTrace, logs);
    return logs;
  }

  private _collectExecutionLogs(trace: EvmMessageTrace, logs: ConsoleLogs) {
    for (const messageTrace of trace.steps) {
      if (isEvmStep(messageTrace) || !isCallTrace(messageTrace)) {
        continue;
      }

      const log = this._maybeConsoleLog(messageTrace);
      if (log !== undefined) {
        logs.push(log);
        continue;
      }

      this._collectExecutionLogs(messageTrace, logs);
    }
  }

  private _maybeConsoleLog(call: CallMessageTrace): ConsoleLogs | undefined {
    const sig = bufferToInt(call.calldata.slice(0, 4));
    const parameters = call.calldata.slice(4);

    const types = this._consoleLogs[sig];
    if (types === undefined) {
      return;
    }

    return this._decode(parameters, types);
  }

  private _decode(data: Buffer, types: string[]): ConsoleLogs {
    return types.map((type, i) => {
      const position = i * 32;
      switch (types[i]) {
        case UintTy:
        case IntTy:
          return fromSigned(data.slice(position, position + M_SIZE)).toString();

        case BoolTy:
          return data[position + 31] !== 0;

        case StringTy:
          const sStart = bufferToInt(data.slice(position, position + M_SIZE));
          const sLen = bufferToInt(data.slice(sStart, sStart + M_SIZE));
          return data.slice(sStart + M_SIZE, sStart + M_SIZE + sLen).toString();

        case AddressTy:
          return bufferToHex(data.slice(position + 12, position + M_SIZE));

        case BytesTy:
          const bStart = bufferToInt(data.slice(position, position + M_SIZE));
          const bLen = bufferToInt(data.slice(bStart, bStart + M_SIZE));
          return bufferToHex(
            data.slice(bStart + M_SIZE, bStart + M_SIZE + bLen)
          );

        case FixedBytesTy:
          return bufferToHex(data.slice(position, position + M_SIZE));

        default:
          return "";
      }
    });
  }
}
