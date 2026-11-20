import { doc } from "../../../shared/document";
export function seed() {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      cx = 400 + Math.cos(a) * 100,
      cy = 280 + Math.sin(a) * 100;
    const nodes = Array.from({ length: 4 }, (_, i) => {
      const t = (i * Math.PI) / 2;
      const x = cx + Math.cos(t) * 65,
        y = cy + Math.sin(t) * 65;
      return {
        x,
        y,
        in: { x: x + Math.sin(t) * 36, y: y - Math.cos(t) * 36 },
        out: { x: x - Math.sin(t) * 36, y: y + Math.cos(t) * 36 },
      };
    });
    doc.shapes.push({
      id: "petal" + k,
      name: "Petal " + (k + 1),
      nodes,
      closed: true,
      fill: ["#7850d6", "#a685ed", "#cbb9f4", "#523391"][k % 4],
      stroke: "#ffffff",
      width: 2,
      opacity: 1,
    });
  }
}
