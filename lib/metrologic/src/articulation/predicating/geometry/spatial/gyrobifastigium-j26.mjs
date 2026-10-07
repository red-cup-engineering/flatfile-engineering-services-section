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
        Object.freeze({ name: "leftTop", vertices: ["q0", "q1", "a"] }),
        Object.freeze({ name: "leftBottom", vertices: ["q3", "q2", "b"] }),
        Object.freeze({ name: "leftSide0", vertices: ["q1", "a", "b", "q2"] }),
        Object.freeze({ name: "leftSide1", vertices: ["a", "q0", "q3", "b"] }),
        Object.freeze({ name: "rightTop", vertices: ["q1", "q2", "c"] }),
        Object.freeze({ name: "rightBottom", vertices: ["q0", "q3", "d"] }),
        Object.freeze({ name: "rightSide0", vertices: ["q2", "c", "d", "q3"] }),
        Object.freeze({ name: "rightSide1", vertices: ["c", "q1", "q0", "d"] }),
    ]),
});
