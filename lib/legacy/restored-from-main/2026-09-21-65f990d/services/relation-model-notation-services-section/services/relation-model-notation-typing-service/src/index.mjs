/** One RMN judgment over the canonical Curry-Howard-Lambek grammar. */
import {
  mapRmnTerm,
  validateRmnTerm,
  validateRmnType,
} from "../../relation-model-notation-service/src/index.mjs";

export function tyEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The sole recursive inference/checking engine. `expected` selects checking. */
export function judgeRmn(ctx, source, expected = undefined) {
  const checkedContext = ctx.map(validateRmnType);
  const term = validateRmnTerm(source);
  const want = expected === undefined ? undefined : validateRmnType(expected);
  return judge(checkedContext, term, want);
}

function judge(ctx, term, want = undefined) {
  const infer = () => {
    switch (term[0]) {
      case "var":
        return ctx[term[1]] ?? null;
      case "star":
        return ["unit"];
      case "mark":
        return ["base"];
      case "four":
        return ["charge"];
      case "effect":
        return ["effect"];
      case "constant":
        return term[1];
      case "predicate":
        return ["relation", term[2], term[3]];
      case "ascribe":
        return judge(ctx, term[2], term[1]) ? term[1] : null;
      case "nil":
        return ["list", term[1]];
      case "vector":
        return term[2].every((child) => judge(ctx, child, term[1]))
          ? ["vector", term[1]]
          : null;
      case "left": {
        const inner = judge(ctx, term[1]);
        return inner ? ["sum", inner, term[2]] : null;
      }
      case "right": {
        const inner = judge(ctx, term[2]);
        return inner ? ["sum", term[1], inner] : null;
      }
      case "cons": {
        let cursor = term;
        let elementType = null;
        while (cursor[0] === "cons") {
          const headType = judge(ctx, cursor[1]);
          if (!headType) return null;
          if (elementType && !tyEqual(elementType, headType)) return null;
          elementType ??= headType;
          cursor = cursor[2];
        }
        return elementType && judge(ctx, cursor, ["list", elementType])
          ? ["list", elementType]
          : null;
      }
      case "app": {
        const fn = judge(ctx, term[1]);
        if (fn?.[0] === "arrow" && judge(ctx, term[2], fn[1])) return fn[2];
        const arg = judge(ctx, term[2]);
        if (want && arg && judge(ctx, term[1], ["arrow", arg, want]))
          return want;
        return arg && term[1][0] === "lam"
          ? judge([arg, ...ctx], term[1][1])
          : null;
      }
      case "pair": {
        const leftTypes = [];
        let cursor = term;
        while (cursor[0] === "pair") {
          const left = judge(ctx, cursor[1]);
          if (!left) return null;
          leftTypes.push(left);
          cursor = cursor[2];
        }
        let result = judge(ctx, cursor);
        if (!result) return null;
        for (let index = leftTypes.length - 1; index >= 0; index -= 1)
          result = ["prod", leftTypes[index], result];
        return result;
      }
      case "fst":
      case "snd": {
        const pair = judge(ctx, term[1]);
        return pair?.[0] === "prod" ? pair[term[0] === "fst" ? 1 : 2] : null;
      }
      case "ground": {
        const predicate = judge(ctx, term[1]);
        return predicate?.[0] === "relation" &&
          judge(ctx, term[2], predicate[1]) &&
          judge(ctx, term[3], predicate[2])
          ? ["grounded", predicate[1], predicate[2]]
          : null;
      }
      case "witness": {
        const grounded = judge(ctx, term[1]);
        return grounded?.[0] === "grounded" &&
          judge(ctx, term[2], ["charge"]) &&
          judge(ctx, term[3], ["charge"])
          ? ["wit", grounded]
          : null;
      }
      case "coincide": {
        const left = judge(ctx, term[1]), right = judge(ctx, term[2]);
        return left && right && tyEqual(left, right) ? ["charge"] : null;
      }
      case "cond": {
        const yes = judge(ctx, term[2]),
          no = judge(ctx, term[3]);
        return judge(ctx, term[1], ["charge"]) && yes && no && tyEqual(yes, no)
          ? yes
          : null;
      }
      case "fold": {
        const list = judge(ctx, term[3]),
          init = judge(ctx, term[2]);
        return list?.[0] === "list" &&
          init &&
          judge(ctx, term[1], ["arrow", init, ["arrow", list[1], init]])
          ? init
          : null;
      }
      default:
        return null;
    }
  };
  if (term[0] === "lam" && want)
    return want[0] === "arrow" && judge([want[1], ...ctx], term[1], want[2]);
  if (term[0] === "pair" && want?.[0] === "prod")
    return judge(ctx, term[1], want[1]) && judge(ctx, term[2], want[2]);
  const got = infer();
  return want === undefined ? got : got !== null && tyEqual(got, want);
}

export function inferTy(ctx, term) {
  return judgeRmn(ctx, term);
}
export function checkTy(ctx, term, type) {
  return judgeRmn(ctx, term, type);
}
export const hasTy = checkTy;
export function termSize(term) {
  let size = 0;
  mapRmnTerm(term, (node) => {
    size += 1;
    return node;
  });
  return size;
}
export function termUses(term) {
  const uses = new Set();
  mapRmnTerm(term, (node) => {
    uses.add(node[0]);
    return node;
  });
  return Object.freeze([...uses].sort());
}
export function isClosed(term) {
  let closed = true;
  mapRmnTerm(term, (node, depth) => {
    if (node[0] === "var" && node[1] >= depth) closed = false;
    return node;
  });
  return closed;
}
