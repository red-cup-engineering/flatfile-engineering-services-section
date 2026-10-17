/**
 * J26 coordinate model and oriented faces, read from Obsmetrologia.AperiodicOrder.J26.faceVertices.
 * A finite combinatorial solid is not a proved space-filling tiling or a market/game institution.
 * Science source: lenticule-science/obsmetrologia/Obsmetrologia/AperiodicOrder/Tiling/J26.lean.
 */
const h = Math.sqrt(3) / 2;
export const gyrobifastigiumJ26 = Object.freeze({
    type: "GyrobifastigiumJ26",
    vertices: Object.freeze({
        q0: Object.freeze([0, -0.5, -0.5]),
        q1: Object.freeze([0, 0.5, -0.5]),
        q2: Object.freeze([0, 0.5, 0.5]),
        q3: Object.freeze([0, -0.5, 0.5]),
        a: Object.freeze([-h, 0, -0.5]),
        b: Object.freeze([-h, 0, 0.5]),
        c: Object.freeze([h, 0.5, 0]),
        d: Object.freeze([h, -0.5, 0]),
    }),
    faces: Object.freeze([
        Object.freeze({ name: "leftTop", vertices: Object.freeze(["q0", "q1", "a"]) }),
        Object.freeze({ name: "leftBottom", vertices: Object.freeze(["q3", "b", "q2"]) }),
        Object.freeze({ name: "leftSide0", vertices: Object.freeze(["q1", "q2", "b", "a"]) }),
        Object.freeze({ name: "leftSide1", vertices: Object.freeze(["a", "b", "q3", "q0"]) }),
        Object.freeze({ name: "rightTop", vertices: Object.freeze(["q1", "c", "q2"]) }),
        Object.freeze({ name: "rightBottom", vertices: Object.freeze(["q0", "q3", "d"]) }),
        Object.freeze({ name: "rightSide0", vertices: Object.freeze(["q2", "c", "d", "q3"]) }),
        Object.freeze({ name: "rightSide1", vertices: Object.freeze(["c", "q1", "q0", "d"]) }),
    ]),
});
