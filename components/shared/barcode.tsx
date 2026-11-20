/** Code 39 barcode as inline SVG. Widely supported by scanners; encodes 0-9 A-Z - . space $ / + % */
const P39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
  $: "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn",
};

export function encodable(text: string): boolean {
  return [...text.toUpperCase()].every((c) => c in P39 && c !== "*");
}

export function Barcode({ value, height = 36, unit = 1.4, showText = true }: { value: string; height?: number; unit?: number; showText?: boolean }) {
  const text = value.toUpperCase();
  if (!encodable(text)) return <div className="text-[10px] text-danger-600">{value}: not printable as Code 39</div>;
  const chars = ["*", ...text, "*"];
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  chars.forEach((c, ci) => {
    [...P39[c]].forEach((el, i) => {
      const w = (el === "w" ? 3 : 1) * unit;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    });
    if (ci < chars.length - 1) x += unit; // inter-character gap
  });
  return (
    <svg viewBox={`0 0 ${x} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />)}
      {showText && null}
    </svg>
  );
}
