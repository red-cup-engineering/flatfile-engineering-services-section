/**
 * Flag values in a token sequence (a command's argument vector, or any list of text tokens):
 * the token following a flag token is that flag's value.
 */

/** The value following the first occurrence of `flag`, or undefined. */
export function readFlagValue(flag, tokens) {
  const index = tokens.indexOf(flag);
  return index === -1 ? undefined : tokens[index + 1];
}

/** The value following the first occurrence of `flag`; refuses when there is none. */
export function readRequiredFlagValue(flag, tokens) {
  const value = readFlagValue(flag, tokens);
  if (value === undefined) throw new Error(`${flag} is required`);
  return value;
}

/** The values following every occurrence of `flag`, in order. */
export function readRepeatedFlagValues(flag, tokens) {
  return tokens.flatMap((token, index) => (token === flag && tokens[index + 1] !== undefined ? [tokens[index + 1]] : []));
}
