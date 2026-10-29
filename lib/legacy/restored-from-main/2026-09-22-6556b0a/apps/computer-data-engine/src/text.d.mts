/** A word span in Unicode text, with UTF-16 offsets matching String.slice. */
export type WordSpan = Readonly<{
    tier: "word";
    text: string;
    start: number;
    end: number;
    numeric?: true;
}>;
/** Whether a word begins with the canonical numeric prefix. */
export declare function isNumericWord(text: string): boolean;
/** Unicode words, internal joiners and numeric amounts, preserving source offsets. */
export declare function tokenizeWords(text: string, baseOffset?: number): readonly WordSpan[];
