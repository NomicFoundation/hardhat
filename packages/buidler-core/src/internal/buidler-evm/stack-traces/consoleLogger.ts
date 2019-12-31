import { BN, bufferToHex, bufferToInt, fromSigned } from "ethereumjs-util";

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

interface ConsoleLogArray extends Array<ConsoleLogEntry> {}

export type ConsoleLogEntry = boolean | string | ConsoleLogArray;

export type ConsoleLogs = ConsoleLogEntry[];

export class ConsoleLogger {
  private _consoleLogs: {
    [key: number]: string[];
  } = {};

  constructor() {
    this._consoleLogs[4163653873] = [UintTy];
    this._consoleLogs[1093685164] = [StringTy];
    this._consoleLogs[843419373] = [BoolTy];
    this._consoleLogs[741264322] = [AddressTy];
    this._consoleLogs[199720790] = [BytesTy];
    this._consoleLogs[666357637] = [FixedBytesTy];
    this._consoleLogs[4133908826] = [UintTy, UintTy];
    this._consoleLogs[1681903839] = [UintTy, StringTy];
    this._consoleLogs[480083635] = [UintTy, BoolTy];
    this._consoleLogs[1764191366] = [UintTy, AddressTy];
    this._consoleLogs[1915691218] = [UintTy, BytesTy];
    this._consoleLogs[3068590169] = [UintTy, FixedBytesTy];
    this._consoleLogs[3054400204] = [StringTy, UintTy];
    this._consoleLogs[1264337527] = [StringTy, StringTy];
    this._consoleLogs[3283441205] = [StringTy, BoolTy];
    this._consoleLogs[832238387] = [StringTy, AddressTy];
    this._consoleLogs[600692968] = [StringTy, BytesTy];
    this._consoleLogs[915592730] = [StringTy, FixedBytesTy];
    this._consoleLogs[965833939] = [BoolTy, UintTy];
    this._consoleLogs[2414527781] = [BoolTy, StringTy];
    this._consoleLogs[705760899] = [BoolTy, BoolTy];
    this._consoleLogs[2235320393] = [BoolTy, AddressTy];
    this._consoleLogs[2906572727] = [BoolTy, BytesTy];
    this._consoleLogs[1684380934] = [BoolTy, FixedBytesTy];
    this._consoleLogs[2198464680] = [AddressTy, UintTy];
    this._consoleLogs[1973388987] = [AddressTy, StringTy];
    this._consoleLogs[1974863315] = [AddressTy, BoolTy];
    this._consoleLogs[3673216170] = [AddressTy, AddressTy];
    this._consoleLogs[3149425099] = [AddressTy, BytesTy];
    this._consoleLogs[3584476231] = [AddressTy, FixedBytesTy];
    this._consoleLogs[3717129730] = [BytesTy, UintTy];
    this._consoleLogs[1339463171] = [BytesTy, StringTy];
    this._consoleLogs[1122521249] = [BytesTy, BoolTy];
    this._consoleLogs[717575934] = [BytesTy, AddressTy];
    this._consoleLogs[1817138454] = [BytesTy, BytesTy];
    this._consoleLogs[919928528] = [BytesTy, FixedBytesTy];
    this._consoleLogs[1398047316] = [FixedBytesTy, UintTy];
    this._consoleLogs[199292535] = [FixedBytesTy, StringTy];
    this._consoleLogs[3382991505] = [FixedBytesTy, BoolTy];
    this._consoleLogs[2411123218] = [FixedBytesTy, AddressTy];
    this._consoleLogs[3609863781] = [FixedBytesTy, BytesTy];
    this._consoleLogs[1282587032] = [FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3522001468] = [UintTy, UintTy, UintTy];
    this._consoleLogs[1909476082] = [UintTy, UintTy, StringTy];
    this._consoleLogs[1197922930] = [UintTy, UintTy, BoolTy];
    this._consoleLogs[1553380145] = [UintTy, UintTy, AddressTy];
    this._consoleLogs[2627838767] = [UintTy, UintTy, BytesTy];
    this._consoleLogs[2542507858] = [UintTy, UintTy, FixedBytesTy];
    this._consoleLogs[933920076] = [UintTy, StringTy, UintTy];
    this._consoleLogs[2970968351] = [UintTy, StringTy, StringTy];
    this._consoleLogs[1290643290] = [UintTy, StringTy, BoolTy];
    this._consoleLogs[2063255897] = [UintTy, StringTy, AddressTy];
    this._consoleLogs[3279210122] = [UintTy, StringTy, BytesTy];
    this._consoleLogs[3267505740] = [UintTy, StringTy, FixedBytesTy];
    this._consoleLogs[537493524] = [UintTy, BoolTy, UintTy];
    this._consoleLogs[2239189025] = [UintTy, BoolTy, StringTy];
    this._consoleLogs[544310864] = [UintTy, BoolTy, BoolTy];
    this._consoleLogs[889741179] = [UintTy, BoolTy, AddressTy];
    this._consoleLogs[2530758068] = [UintTy, BoolTy, BytesTy];
    this._consoleLogs[2101037161] = [UintTy, BoolTy, FixedBytesTy];
    this._consoleLogs[1520131797] = [UintTy, AddressTy, UintTy];
    this._consoleLogs[1674265081] = [UintTy, AddressTy, StringTy];
    this._consoleLogs[2607726658] = [UintTy, AddressTy, BoolTy];
    this._consoleLogs[3170737120] = [UintTy, AddressTy, AddressTy];
    this._consoleLogs[367319411] = [UintTy, AddressTy, BytesTy];
    this._consoleLogs[1799892918] = [UintTy, AddressTy, FixedBytesTy];
    this._consoleLogs[2865891495] = [UintTy, BytesTy, UintTy];
    this._consoleLogs[2560257160] = [UintTy, BytesTy, StringTy];
    this._consoleLogs[2421864762] = [UintTy, BytesTy, BoolTy];
    this._consoleLogs[1685261899] = [UintTy, BytesTy, AddressTy];
    this._consoleLogs[1850191267] = [UintTy, BytesTy, BytesTy];
    this._consoleLogs[1934733268] = [UintTy, BytesTy, FixedBytesTy];
    this._consoleLogs[1516309683] = [UintTy, FixedBytesTy, UintTy];
    this._consoleLogs[456341880] = [UintTy, FixedBytesTy, StringTy];
    this._consoleLogs[1901541868] = [UintTy, FixedBytesTy, BoolTy];
    this._consoleLogs[1341876920] = [UintTy, FixedBytesTy, AddressTy];
    this._consoleLogs[3353899377] = [UintTy, FixedBytesTy, BytesTy];
    this._consoleLogs[122442440] = [UintTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3393701099] = [StringTy, UintTy, UintTy];
    this._consoleLogs[1500569737] = [StringTy, UintTy, StringTy];
    this._consoleLogs[3396809649] = [StringTy, UintTy, BoolTy];
    this._consoleLogs[478069832] = [StringTy, UintTy, AddressTy];
    this._consoleLogs[4190781540] = [StringTy, UintTy, BytesTy];
    this._consoleLogs[4205224377] = [StringTy, UintTy, FixedBytesTy];
    this._consoleLogs[1478619041] = [StringTy, StringTy, UintTy];
    this._consoleLogs[753761519] = [StringTy, StringTy, StringTy];
    this._consoleLogs[2967534005] = [StringTy, StringTy, BoolTy];
    this._consoleLogs[2515337621] = [StringTy, StringTy, AddressTy];
    this._consoleLogs[3122690189] = [StringTy, StringTy, BytesTy];
    this._consoleLogs[2944361218] = [StringTy, StringTy, FixedBytesTy];
    this._consoleLogs[3378075862] = [StringTy, BoolTy, UintTy];
    this._consoleLogs[3801674877] = [StringTy, BoolTy, StringTy];
    this._consoleLogs[2232122070] = [StringTy, BoolTy, BoolTy];
    this._consoleLogs[2469116728] = [StringTy, BoolTy, AddressTy];
    this._consoleLogs[191267460] = [StringTy, BoolTy, BytesTy];
    this._consoleLogs[102800003] = [StringTy, BoolTy, FixedBytesTy];
    this._consoleLogs[220641573] = [StringTy, AddressTy, UintTy];
    this._consoleLogs[3773410639] = [StringTy, AddressTy, StringTy];
    this._consoleLogs[3374145236] = [StringTy, AddressTy, BoolTy];
    this._consoleLogs[4243355104] = [StringTy, AddressTy, AddressTy];
    this._consoleLogs[3561138665] = [StringTy, AddressTy, BytesTy];
    this._consoleLogs[3931454952] = [StringTy, AddressTy, FixedBytesTy];
    this._consoleLogs[2827173946] = [StringTy, BytesTy, UintTy];
    this._consoleLogs[205796982] = [StringTy, BytesTy, StringTy];
    this._consoleLogs[4242060921] = [StringTy, BytesTy, BoolTy];
    this._consoleLogs[3054363564] = [StringTy, BytesTy, AddressTy];
    this._consoleLogs[911692939] = [StringTy, BytesTy, BytesTy];
    this._consoleLogs[685778361] = [StringTy, BytesTy, FixedBytesTy];
    this._consoleLogs[1908514537] = [StringTy, FixedBytesTy, UintTy];
    this._consoleLogs[4141558395] = [StringTy, FixedBytesTy, StringTy];
    this._consoleLogs[1050047948] = [StringTy, FixedBytesTy, BoolTy];
    this._consoleLogs[2763405631] = [StringTy, FixedBytesTy, AddressTy];
    this._consoleLogs[507729429] = [StringTy, FixedBytesTy, BytesTy];
    this._consoleLogs[1580124834] = [StringTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[923808615] = [BoolTy, UintTy, UintTy];
    this._consoleLogs[3288086896] = [BoolTy, UintTy, StringTy];
    this._consoleLogs[3906927529] = [BoolTy, UintTy, BoolTy];
    this._consoleLogs[143587794] = [BoolTy, UintTy, AddressTy];
    this._consoleLogs[3637048494] = [BoolTy, UintTy, BytesTy];
    this._consoleLogs[870196868] = [BoolTy, UintTy, FixedBytesTy];
    this._consoleLogs[278130193] = [BoolTy, StringTy, UintTy];
    this._consoleLogs[2960557183] = [BoolTy, StringTy, StringTy];
    this._consoleLogs[3686056519] = [BoolTy, StringTy, BoolTy];
    this._consoleLogs[2509355347] = [BoolTy, StringTy, AddressTy];
    this._consoleLogs[2203033993] = [BoolTy, StringTy, BytesTy];
    this._consoleLogs[2200528205] = [BoolTy, StringTy, FixedBytesTy];
    this._consoleLogs[317855234] = [BoolTy, BoolTy, UintTy];
    this._consoleLogs[626391622] = [BoolTy, BoolTy, StringTy];
    this._consoleLogs[1349555864] = [BoolTy, BoolTy, BoolTy];
    this._consoleLogs[276362893] = [BoolTy, BoolTy, AddressTy];
    this._consoleLogs[1882785417] = [BoolTy, BoolTy, BytesTy];
    this._consoleLogs[3680836556] = [BoolTy, BoolTy, FixedBytesTy];
    this._consoleLogs[1601936123] = [BoolTy, AddressTy, UintTy];
    this._consoleLogs[3734671984] = [BoolTy, AddressTy, StringTy];
    this._consoleLogs[415876934] = [BoolTy, AddressTy, BoolTy];
    this._consoleLogs[3530962535] = [BoolTy, AddressTy, AddressTy];
    this._consoleLogs[2961736822] = [BoolTy, AddressTy, BytesTy];
    this._consoleLogs[2172523983] = [BoolTy, AddressTy, FixedBytesTy];
    this._consoleLogs[717302297] = [BoolTy, BytesTy, UintTy];
    this._consoleLogs[2690275160] = [BoolTy, BytesTy, StringTy];
    this._consoleLogs[2970480150] = [BoolTy, BytesTy, BoolTy];
    this._consoleLogs[816383064] = [BoolTy, BytesTy, AddressTy];
    this._consoleLogs[2338489978] = [BoolTy, BytesTy, BytesTy];
    this._consoleLogs[96189370] = [BoolTy, BytesTy, FixedBytesTy];
    this._consoleLogs[4270807846] = [BoolTy, FixedBytesTy, UintTy];
    this._consoleLogs[1180573628] = [BoolTy, FixedBytesTy, StringTy];
    this._consoleLogs[24284454] = [BoolTy, FixedBytesTy, BoolTy];
    this._consoleLogs[3568814267] = [BoolTy, FixedBytesTy, AddressTy];
    this._consoleLogs[2774060055] = [BoolTy, FixedBytesTy, BytesTy];
    this._consoleLogs[3158047261] = [BoolTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3063663350] = [AddressTy, UintTy, UintTy];
    this._consoleLogs[2717051050] = [AddressTy, UintTy, StringTy];
    this._consoleLogs[1736575400] = [AddressTy, UintTy, BoolTy];
    this._consoleLogs[2076235848] = [AddressTy, UintTy, AddressTy];
    this._consoleLogs[2162395753] = [AddressTy, UintTy, BytesTy];
    this._consoleLogs[4233857079] = [AddressTy, UintTy, FixedBytesTy];
    this._consoleLogs[1742565361] = [AddressTy, StringTy, UintTy];
    this._consoleLogs[4218888805] = [AddressTy, StringTy, StringTy];
    this._consoleLogs[3473018801] = [AddressTy, StringTy, BoolTy];
    this._consoleLogs[4035396840] = [AddressTy, StringTy, AddressTy];
    this._consoleLogs[2781938547] = [AddressTy, StringTy, BytesTy];
    this._consoleLogs[612175108] = [AddressTy, StringTy, FixedBytesTy];
    this._consoleLogs[2622462459] = [AddressTy, BoolTy, UintTy];
    this._consoleLogs[555898316] = [AddressTy, BoolTy, StringTy];
    this._consoleLogs[3951234194] = [AddressTy, BoolTy, BoolTy];
    this._consoleLogs[4044790253] = [AddressTy, BoolTy, AddressTy];
    this._consoleLogs[4189232919] = [AddressTy, BoolTy, BytesTy];
    this._consoleLogs[3054956539] = [AddressTy, BoolTy, FixedBytesTy];
    this._consoleLogs[402547077] = [AddressTy, AddressTy, UintTy];
    this._consoleLogs[7426238] = [AddressTy, AddressTy, StringTy];
    this._consoleLogs[4070990470] = [AddressTy, AddressTy, BoolTy];
    this._consoleLogs[25986242] = [AddressTy, AddressTy, AddressTy];
    this._consoleLogs[9556870] = [AddressTy, AddressTy, BytesTy];
    this._consoleLogs[1641054104] = [AddressTy, AddressTy, FixedBytesTy];
    this._consoleLogs[2469990637] = [AddressTy, BytesTy, UintTy];
    this._consoleLogs[1711029854] = [AddressTy, BytesTy, StringTy];
    this._consoleLogs[1569585424] = [AddressTy, BytesTy, BoolTy];
    this._consoleLogs[794509740] = [AddressTy, BytesTy, AddressTy];
    this._consoleLogs[1019848341] = [AddressTy, BytesTy, BytesTy];
    this._consoleLogs[408571406] = [AddressTy, BytesTy, FixedBytesTy];
    this._consoleLogs[1113147938] = [AddressTy, FixedBytesTy, UintTy];
    this._consoleLogs[1617589546] = [AddressTy, FixedBytesTy, StringTy];
    this._consoleLogs[3731441626] = [AddressTy, FixedBytesTy, BoolTy];
    this._consoleLogs[666943222] = [AddressTy, FixedBytesTy, AddressTy];
    this._consoleLogs[2620454752] = [AddressTy, FixedBytesTy, BytesTy];
    this._consoleLogs[2866447524] = [AddressTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[3560999240] = [BytesTy, UintTy, UintTy];
    this._consoleLogs[3761635787] = [BytesTy, UintTy, StringTy];
    this._consoleLogs[3422324825] = [BytesTy, UintTy, BoolTy];
    this._consoleLogs[2142561906] = [BytesTy, UintTy, AddressTy];
    this._consoleLogs[3211845364] = [BytesTy, UintTy, BytesTy];
    this._consoleLogs[2153001193] = [BytesTy, UintTy, FixedBytesTy];
    this._consoleLogs[2269840451] = [BytesTy, StringTy, UintTy];
    this._consoleLogs[2525963234] = [BytesTy, StringTy, StringTy];
    this._consoleLogs[3353993453] = [BytesTy, StringTy, BoolTy];
    this._consoleLogs[3516154280] = [BytesTy, StringTy, AddressTy];
    this._consoleLogs[2705286881] = [BytesTy, StringTy, BytesTy];
    this._consoleLogs[109117589] = [BytesTy, StringTy, FixedBytesTy];
    this._consoleLogs[415697379] = [BytesTy, BoolTy, UintTy];
    this._consoleLogs[2090973436] = [BytesTy, BoolTy, StringTy];
    this._consoleLogs[202529828] = [BytesTy, BoolTy, BoolTy];
    this._consoleLogs[3055806695] = [BytesTy, BoolTy, AddressTy];
    this._consoleLogs[807555635] = [BytesTy, BoolTy, BytesTy];
    this._consoleLogs[1780615932] = [BytesTy, BoolTy, FixedBytesTy];
    this._consoleLogs[3690358883] = [BytesTy, AddressTy, UintTy];
    this._consoleLogs[3739327202] = [BytesTy, AddressTy, StringTy];
    this._consoleLogs[571434503] = [BytesTy, AddressTy, BoolTy];
    this._consoleLogs[2796487134] = [BytesTy, AddressTy, AddressTy];
    this._consoleLogs[762092900] = [BytesTy, AddressTy, BytesTy];
    this._consoleLogs[723044283] = [BytesTy, AddressTy, FixedBytesTy];
    this._consoleLogs[1974463565] = [BytesTy, BytesTy, UintTy];
    this._consoleLogs[3658107229] = [BytesTy, BytesTy, StringTy];
    this._consoleLogs[396041104] = [BytesTy, BytesTy, BoolTy];
    this._consoleLogs[542584028] = [BytesTy, BytesTy, AddressTy];
    this._consoleLogs[3242406543] = [BytesTy, BytesTy, BytesTy];
    this._consoleLogs[2438347646] = [BytesTy, BytesTy, FixedBytesTy];
    this._consoleLogs[3972429951] = [BytesTy, FixedBytesTy, UintTy];
    this._consoleLogs[3604174130] = [BytesTy, FixedBytesTy, StringTy];
    this._consoleLogs[3498643296] = [BytesTy, FixedBytesTy, BoolTy];
    this._consoleLogs[3561318633] = [BytesTy, FixedBytesTy, AddressTy];
    this._consoleLogs[1419515066] = [BytesTy, FixedBytesTy, BytesTy];
    this._consoleLogs[2927615885] = [BytesTy, FixedBytesTy, FixedBytesTy];
    this._consoleLogs[1927927088] = [FixedBytesTy, UintTy, UintTy];
    this._consoleLogs[1960411395] = [FixedBytesTy, UintTy, StringTy];
    this._consoleLogs[1779690603] = [FixedBytesTy, UintTy, BoolTy];
    this._consoleLogs[2629083620] = [FixedBytesTy, UintTy, AddressTy];
    this._consoleLogs[872902235] = [FixedBytesTy, UintTy, BytesTy];
    this._consoleLogs[3909411700] = [FixedBytesTy, UintTy, FixedBytesTy];
    this._consoleLogs[3825343278] = [FixedBytesTy, StringTy, UintTy];
    this._consoleLogs[3889217414] = [FixedBytesTy, StringTy, StringTy];
    this._consoleLogs[543029815] = [FixedBytesTy, StringTy, BoolTy];
    this._consoleLogs[1958512762] = [FixedBytesTy, StringTy, AddressTy];
    this._consoleLogs[3500241505] = [FixedBytesTy, StringTy, BytesTy];
    this._consoleLogs[4255683764] = [FixedBytesTy, StringTy, FixedBytesTy];
    this._consoleLogs[4046122768] = [FixedBytesTy, BoolTy, UintTy];
    this._consoleLogs[2453215636] = [FixedBytesTy, BoolTy, StringTy];
    this._consoleLogs[1635513146] = [FixedBytesTy, BoolTy, BoolTy];
    this._consoleLogs[3084094145] = [FixedBytesTy, BoolTy, AddressTy];
    this._consoleLogs[3815442884] = [FixedBytesTy, BoolTy, BytesTy];
    this._consoleLogs[2276643425] = [FixedBytesTy, BoolTy, FixedBytesTy];
    this._consoleLogs[3520451767] = [FixedBytesTy, AddressTy, UintTy];
    this._consoleLogs[545270351] = [FixedBytesTy, AddressTy, StringTy];
    this._consoleLogs[144765283] = [FixedBytesTy, AddressTy, BoolTy];
    this._consoleLogs[2197235012] = [FixedBytesTy, AddressTy, AddressTy];
    this._consoleLogs[1044108377] = [FixedBytesTy, AddressTy, BytesTy];
    this._consoleLogs[4007558098] = [FixedBytesTy, AddressTy, FixedBytesTy];
    this._consoleLogs[4104431725] = [FixedBytesTy, BytesTy, UintTy];
    this._consoleLogs[3214992443] = [FixedBytesTy, BytesTy, StringTy];
    this._consoleLogs[632829971] = [FixedBytesTy, BytesTy, BoolTy];
    this._consoleLogs[3902105282] = [FixedBytesTy, BytesTy, AddressTy];
    this._consoleLogs[4085865602] = [FixedBytesTy, BytesTy, BytesTy];
    this._consoleLogs[322068604] = [FixedBytesTy, BytesTy, FixedBytesTy];
    this._consoleLogs[3565525131] = [FixedBytesTy, FixedBytesTy, UintTy];
    this._consoleLogs[1346097503] = [FixedBytesTy, FixedBytesTy, StringTy];
    this._consoleLogs[4144769124] = [FixedBytesTy, FixedBytesTy, BoolTy];
    this._consoleLogs[3415571749] = [FixedBytesTy, FixedBytesTy, AddressTy];
    this._consoleLogs[3807205565] = [FixedBytesTy, FixedBytesTy, BytesTy];
    this._consoleLogs[2623619369] = [FixedBytesTy, FixedBytesTy, FixedBytesTy];
  }

  public printLogs(maybeDecodedMessageTrace: MessageTrace) {
    if (isPrecompileTrace(maybeDecodedMessageTrace)) {
      return;
    }

    this._printExecutionLogs(maybeDecodedMessageTrace);
  }

  private _printExecutionLogs(trace: EvmMessageTrace) {
    for (const messageTrace of trace.steps) {
      if (isEvmStep(messageTrace) || !isCallTrace(messageTrace)) {
        continue;
      }

      const logs = this._maybeConsoleLog(messageTrace);
      if (logs !== undefined) {
        console.log(...logs);
        continue;
      }

      this._printExecutionLogs(messageTrace);
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
    const logs: ConsoleLogs = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < types.length; ++i) {
      const position = i * 32;
      switch (types[i]) {
        case UintTy:
        case IntTy:
          logs.push(fromSigned(data.slice(position, position + 32)).toString());
          break;

        case BoolTy:
          if (data[i * 32 + 31] === 0) {
            logs.push(false);
          } else {
            logs.push(true);
          }
          break;

        case StringTy:
          const sStart = bufferToInt(data.slice(position, position + 32));
          const sLen = bufferToInt(data.slice(sStart, sStart + 32));
          logs.push(data.slice(sStart + 32, sStart + 32 + sLen).toString());
          break;

        case AddressTy:
          logs.push(bufferToHex(data.slice(position + 12, position + 32)));
          break;

        case BytesTy:
          const bStart = bufferToInt(data.slice(position, position + 32));
          const bLen = bufferToInt(data.slice(bStart, bStart + 32));
          logs.push(bufferToHex(data.slice(bStart + 32, bStart + 32 + bLen)));
          break;

        case FixedBytesTy:
          logs.push(bufferToHex(data.slice(position, position + 32)));
          break;
      }
    }

    return logs;
  }
}
