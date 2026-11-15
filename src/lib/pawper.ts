// Wells, Goldstein & Bentley (2017), Table 2. Numerical data in tenths of cm.
// https://doi.org/10.7196/SAMJ.2017.v107i11.12505
// This is the original table, not the discrepant 2019 supplementary formula.
export const PAWPER_REFERENCE = {
  version: 'PAWPER XL-MAC · 2017 Table 2',
  url: 'https://www.scielo.org.za/scielo.php?script=sci_arttext&pid=S0256-95742017001100022',
  minLengthCm: 43,
  maxLengthCm: 180
} as const;

// [inclusive length minimum, inclusive maximum, six MAC lower cut-offs, seven TBWs in kg]
const BANDS: readonly (readonly [number, number, readonly number[], readonly number[]])[] = [
  [430, 493, [94, 104, 116, 128, 140, 152], [2.5, 2.8, 3, 3.2, 3.5, 4, 4.5]],
  [494, 548, [96, 105, 118, 130, 142, 155], [3.5, 3.8, 4, 4.5, 5, 6, 7]],
  [549, 592, [110, 115, 125, 135, 155, 165], [4, 4.5, 5, 5.5, 6, 7, 8]],
  [593, 629, [115, 120, 132, 143, 153, 165], [5, 5.5, 6, 6.5, 7, 8, 9]],
  [630, 664, [115, 130, 145, 154, 165, 175], [6, 6.5, 7, 7.5, 8, 9, 10]],
  [665, 701, [125, 137, 145, 155, 170, 185], [7, 7.5, 8, 8.5, 9.5, 10, 11]],
  [702, 739, [126, 142, 155, 163, 182, 200], [7.5, 8.5, 9, 10, 11, 12, 13]],
  [740, 782, [127, 145, 155, 171, 187, 205], [8.5, 9.5, 10, 11, 12, 13, 14]],
  [783, 831, [127, 147, 155, 171, 190, 205], [9, 10, 11, 12, 13, 14, 15]],
  [832, 880, [130, 149, 158, 172, 190, 205], [10, 11, 12, 13, 14, 16, 18]],
  [881, 926, [135, 149, 159, 173, 191, 210], [11, 12, 13, 14, 15, 17, 19]],
  [927, 968, [142, 152, 166, 177, 194, 210], [12, 13, 14, 15, 17, 19, 21]],
  [969, 1006, [144, 157, 166, 177, 195, 215], [13, 14, 15, 16, 18, 20, 22]],
  [1007, 1039, [148, 158, 171, 180, 198, 225], [14, 15, 16, 17, 19, 21, 23]],
  [1040, 1070, [153, 160, 175, 181, 200, 225], [15, 16, 17, 18, 20, 22, 24]],
  [1071, 1100, [156, 167, 179, 187, 220, 235], [16, 17, 18, 19, 21, 24, 26]],
  [1101, 1132, [156, 167, 179, 203, 226, 245], [16, 18, 19, 21, 23, 25, 28]],
  [1133, 1165, [156, 176, 185, 203, 230, 245], [17, 19, 20, 22, 24, 26, 29]],
  [1166, 1206, [163, 178, 192, 213, 232, 249], [20, 21, 22, 24, 27, 29, 32]],
  [1207, 1254, [165, 183, 195, 219, 235, 249], [21, 23, 24, 26, 29, 32, 35]],
  [1255, 1296, [175, 186, 205, 221, 245, 255], [23, 25, 26, 28, 31, 34, 37]],
  [1297, 1333, [178, 188, 208, 224, 257, 267], [24, 26, 28, 30, 33, 36, 40]],
  [1334, 1366, [179, 195, 221, 230, 257, 267], [26, 28, 30, 33, 36, 40, 44]],
  [1367, 1398, [192, 205, 224, 240, 257, 270], [28, 30, 32, 35, 39, 42, 47]],
  [1399, 1432, [192, 208, 233, 247, 266, 283], [29, 32, 34, 38, 42, 46, 50]],
  [1433, 1465, [195, 211, 234, 247, 270, 300], [29, 33, 36, 39, 43, 48, 52]],
  [1466, 1498, [202, 217, 234, 250, 270, 287], [33, 36, 38, 41, 45, 50, 58]],
  [1499, 1531, [208, 226, 242, 262, 279, 300], [36, 39, 40, 48, 52, 57, 65]],
  [1532, 1580, [211, 235, 256, 282, 316, 352], [38, 43, 45, 55, 64, 72, 84]],
  [1581, 1650, [220, 239, 262, 302, 328, 354], [40, 45, 50, 60, 72, 79, 87]],
  [1651, 1700, [227, 240, 275, 305, 338, 367], [45, 49, 55, 65, 75, 85, 99]],
  [1701, 1740, [232, 253, 301, 334, 356, 399], [46, 54, 60, 77, 83, 91, 105]],
  [1741, 1770, [242, 275, 303, 352, 394, 410], [52, 59, 65, 80, 89, 98, 108]],
  [1771, 1800, [257, 283, 327, 361, 396, 414], [55, 63, 70, 87, 95, 105, 116]],
];

export interface PawperEstimate {
  weightKg: number;
  lengthCm: number;
  macCm: number;
  habitusScore: number;
  bandMinCm: number;
  bandMaxCm: number;
  reference: typeof PAWPER_REFERENCE.version;
}

export function evaluatePawper(length: string, mac: string): {
  estimate?: PawperEstimate;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  for (const [field, raw, label] of [['length', length, 'Body length'], ['mac', mac, 'Mid-arm circumference']]) {
    const value = Number(raw);
    if (!raw.trim() || !Number.isFinite(value) || value <= 0) {
      errors[field] = `${label} must be a number greater than 0, in cm.`;
    } else if (!/^(?:\d+(?:\.\d)?|\.\d)$/.test(raw.trim())) {
      errors[field] = 'Enter centimetres with at most one decimal place; do not enter units or round automatically.';
    }
  }
  const lengthCm = Number(length);
  const macCm = Number(mac);
  if (!errors.length && (lengthCm < PAWPER_REFERENCE.minLengthCm || lengthCm > PAWPER_REFERENCE.maxLengthCm)) {
    errors.length = 'Outside the published 43–180 cm length range. Use a measured weight; no extrapolation is available.';
  }
  if (Object.keys(errors).length) return { errors };
  const lengthTenths = Math.round(lengthCm * 10);
  const macTenths = Math.round(macCm * 10);
  const band = BANDS.find(([min, max]) => lengthTenths >= min && lengthTenths <= max)!;
  const index = band[2].filter(cutoff => macTenths >= cutoff).length;
  return {
    errors,
    estimate: {
      weightKg: band[3][index],
      lengthCm,
      macCm,
      habitusScore: index + 1,
      bandMinCm: band[0] / 10,
      bandMaxCm: band[1] / 10,
      reference: PAWPER_REFERENCE.version
    }
  };
}
