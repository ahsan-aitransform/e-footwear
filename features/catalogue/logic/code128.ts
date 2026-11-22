// A Code 128 barcode encoder (no library). It writes the bars as a list of module widths (bar, space, bar, ...), which the
// label page draws as SVG rectangles. Code set B covers every printable ASCII character a barcode here may contain
// (VariantRules.EnsureValidBarcode: characters ! to ~); runs of 4 or more digits use code set C, which halves the width.

// Bar and space widths of the 107 symbols (0-105 data, 106 stop), each a string of six widths (the stop has seven).
const SYMBOL_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_CODE_B = 104;
const START_CODE_C = 105;
const CODE_SET_C_SWITCH_FROM_B = 99;
const CODE_SET_B_SWITCH_FROM_C = 100;
const STOP_SYMBOL = 106;
const MODULUS = 103;
const MINIMUM_DIGIT_RUN_FOR_CODE_SET_C = 4;

export const CODE_128_QUIET_ZONE_MODULES = 10;

function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
}

// The symbol values (start, data, checksum, stop) of the text.
export function encodeCode128Symbols(text: string): number[] {
  if (text.length === 0) throw new RangeError("A barcode cannot be empty.");
  for (const character of text) {
    const code = character.charCodeAt(0);
    if (code < 32 || code > 126) throw new RangeError(`"${character}" cannot be written in Code 128 set B.`);
  }

  const symbols: number[] = [];
  let index = 0;
  let inSetC = false;

  const digitRunAt = (from: number): number => {
    let end = from;
    while (end < text.length && isDigit(text[end])) end += 1;
    return end - from;
  };

  while (index < text.length) {
    const run = digitRunAt(index);
    // A run of digits goes in set C (two digits per symbol); an odd digit stays in set B. At the very start a shorter run is enough.
    const wantsSetC = run >= MINIMUM_DIGIT_RUN_FOR_CODE_SET_C || (index === 0 && run >= 2 && run === text.length && run % 2 === 0);
    if (wantsSetC) {
      const pairs = Math.floor(run / 2);
      if (symbols.length === 0) symbols.push(START_CODE_C);
      else if (!inSetC) symbols.push(CODE_SET_C_SWITCH_FROM_B);
      inSetC = true;
      for (let pair = 0; pair < pairs; pair += 1) symbols.push(Number(text.slice(index + pair * 2, index + pair * 2 + 2)));
      index += pairs * 2;
      continue;
    }
    if (symbols.length === 0) symbols.push(START_CODE_B);
    else if (inSetC) symbols.push(CODE_SET_B_SWITCH_FROM_C);
    inSetC = false;
    symbols.push(text.charCodeAt(index) - 32);
    index += 1;
  }

  let checksum = symbols[0];
  for (let position = 1; position < symbols.length; position += 1) checksum += symbols[position] * position;
  symbols.push(checksum % MODULUS, STOP_SYMBOL);
  return symbols;
}

// Module widths from the first bar: [bar, space, bar, ...]. The sum is the width of the code without the quiet zones.
export function encodeCode128ModuleWidths(text: string): number[] {
  return encodeCode128Symbols(text).flatMap((symbol) => [...SYMBOL_PATTERNS[symbol]].map(Number));
}

// The bars as x / width rectangles (in modules) for drawing, with the total width including both quiet zones.
export function buildCode128Bars(text: string): { bars: { x: number; width: number }[]; totalModules: number } {
  const widths = encodeCode128ModuleWidths(text);
  const bars: { x: number; width: number }[] = [];
  let cursor = CODE_128_QUIET_ZONE_MODULES;
  widths.forEach((width, widthIndex) => {
    if (widthIndex % 2 === 0) bars.push({ x: cursor, width });
    cursor += width;
  });
  return { bars, totalModules: cursor + CODE_128_QUIET_ZONE_MODULES };
}
