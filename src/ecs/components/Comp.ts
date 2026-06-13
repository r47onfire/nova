import { Renderer } from "../../rendering/Renderer";
import { GameObj } from "../entity/GameObjType";

export type CompID = `${string}:${string}`;

export abstract class Comp {
    constructor(public id: CompID, public require: CompID[] = []) {
        if (new.target === Comp) {
            throw new Error("can't instantiate Comp directly");
        }
    }
    // static fromState(data: JSONValue): Comp {
    //     throw new Error(`${stringify(this.prototype.id)} has no fromSerialized() implementation`);
    // }
    init(this: GameObj): void { }
    update(this: GameObj, dt: number): void { }
    fixedTick(this: GameObj, dt: number): void { }
    draw(this: GameObj, renderer: Renderer): void { }
    cleanup(this: GameObj): void { }
    inspect(this: GameObj): string | undefined { return undefined; }
    drawInspect(this: GameObj, renderer: Renderer): void { }
    // getState(this: GameObj): JSONValue {
    //     this.GAME.bluescreen("missing component getState()");
    // }
}

const getPrototypeOf = Object.getPrototypeOf;
export const allCompKeys = (comp: Comp): string[] => {
    const allKeys = [];
    while (comp !== Comp.prototype) {
        allKeys.push(...Object.getOwnPropertyNames(comp).filter(x => x !== "constructor"));
        comp = getPrototypeOf(comp);
    }
    return allKeys;
}

export const getPropertyDescriptor = (obj: any, name: string): PropertyDescriptor | null => {
    while (obj) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, name);
        if (descriptor) return descriptor;
        obj = getPrototypeOf(obj);
    }
    return null;
}

export const isCompDescriptor = (property: string) => {
    return property === "id" || property === "require" || property in Comp.prototype;
}

export type AlreadyBoundComp = {
    [K in keyof Comp]: Comp[K] extends (this: GameObj, ...args: infer A) => infer R ? (...args: A) => R : Comp[K];
};
