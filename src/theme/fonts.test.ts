import { fontAssets, fontStyle, type FontFace, type FontWeight } from "./fonts";
import { typography } from "./typography";

const FACES: FontFace[] = ["sans", "sansWide", "mono"];
const WEIGHTS: FontWeight[] = [400, 500, 550, 600, 650, 700];

describe("fontStyle", () => {
  it("names a bundled file for every face and weight, and no synthetic weight", () => {
    for (const face of FACES) {
      for (const weight of WEIGHTS) {
        const style = fontStyle(face, weight);
        expect(Object.keys(fontAssets)).toContain(style.fontFamily);
        expect(style.fontWeight).toBeUndefined();
      }
    }
  });

  it("draws titles widened and figures in the condensed mono", () => {
    expect(typography.title.fontFamily).toBe("ArchivoWide-650");
    expect(typography.body.fontFamily).toBe("Archivo-400");
    expect(typography.figure.fontFamily).toBe("MartianMono-600");
    expect(typography.mono.fontFamily).toBe("MartianMono-400");
  });
});
