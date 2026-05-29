import { Vec2 } from "@r47onfire/game-math";
import { isArray } from "lib0/array";
import { keys } from "lib0/object";

export const SCRATCH_POINT = new Vec2();

export const deepEqual = <T>(a: T, b: T): boolean => {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (isArray(a) && isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    if (isArray(a) !== isArray(b)) return false;

    const keysA = keys(a);
    const keysB = keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual((<any>a)[key], (<any>b)[key])) return false;
    }
    return true;
}
