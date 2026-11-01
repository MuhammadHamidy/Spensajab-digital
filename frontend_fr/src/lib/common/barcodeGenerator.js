/**
 * Code 128 Barcode Generator (Pure JS / SVG)
 * Produces clean SVG barcode markup ready for high-DPI thermal/laser printing & UI display.
 */

// Code 128 pattern table (values 0-106)
// Each pattern has 6 bar/space widths summing to 11 modules (stop pattern has 7 widths summing to 13)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                                 // 100-106 (106 is STOP)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes text into Code 128B module bars.
 * Returns array of bar widths ('1' or '0' string of modules).
 */
export function encodeCode128B(text) {
  if (!text) text = "SAMPLE";
  
  const codes = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // ASCII 32 (' ') to 126 ('~') maps to value (charCode - 32)
    let val = charCode - 32;
    if (val < 0 || val > 95) val = 0; // fallback to space
    codes.push(val);
    checkSum += val * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP_CODE);

  // Convert pattern strings to binary modules
  let binaryModules = "";
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      binaryModules += (isBar ? "1" : "0").repeat(width);
      isBar = !isBar;
    }
  }

  return binaryModules;
}

/**
 * Returns SVG string of the barcode.
 */
export function generateBarcodeSVG(text, options = {}) {
  const {
    width = 240,
    height = 65,
    showText = true,
    fontSize = 11,
    fontFamily = "monospace",
    barColor = "#000000",
    bgColor = "#FFFFFF",
  } = options;

  const modules = encodeCode128B(text);
  const totalModules = modules.length;
  const quietZone = 10; // quiet zone in module units
  const totalWidthUnits = totalModules + quietZone * 2;
  const unitWidth = width / totalWidthUnits;

  const barHeight = showText ? height - fontSize - 6 : height;

  let rects = "";
  let inBar = false;
  let startX = 0;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === "1" && !inBar) {
      inBar = true;
      startX = (quietZone + i) * unitWidth;
    } else if (modules[i] === "0" && inBar) {
      inBar = false;
      const w = ((quietZone + i) * unitWidth) - startX;
      rects += `<rect x="${startX.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${barHeight}" fill="${barColor}" />`;
    }
  }
  if (inBar) {
    const w = ((quietZone + modules.length) * unitWidth) - startX;
    rects += `<rect x="${startX.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${barHeight}" fill="${barColor}" />`;
  }

  let textSvg = "";
  if (showText) {
    textSvg = `<text x="${(width / 2).toFixed(1)}" y="${(height - 2).toFixed(1)}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600" text-anchor="middle" fill="${barColor}" letter-spacing="1.5">${text}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color:${bgColor}; display:block;">${rects}${textSvg}</svg>`;
}

/**
 * React Component for Barcode Display
 */
export function Barcode({ value, width = 200, height = 60, showText = true, className = "" }) {
  const svg = generateBarcodeSVG(value, { width, height, showText });
  return (
    <div
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
