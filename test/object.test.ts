import { describe, expect, test } from "bun:test";
import Nova from "../src";
import { Comp } from "../src/ecs/components/Comp";
import { GameObjRaw } from "../src/ecs/entity/GameObj";
import { GameObj } from "../src/ecs/entity/GameObjType";

const DUMMY_GAME = {
    emit(name, arg = undefined) { },
} satisfies Partial<Nova> as Nova;

class A extends Comp { constructor() { super("test:a", ["test:b"]) } }
class B extends Comp { constructor() { super("test:b"); } }
class C extends Comp {
    constructor() { super("test:c") }
    foo = 123;
}
class D extends Comp {
    constructor() { super("test:d") }
    foo() {
        expect(this).toBeInstanceOf(GameObjRaw);
    }
}

describe("adding comps", () => {
    test("comps added on init don't have to be in dependency order", () => {
        expect(() => new GameObjRaw(DUMMY_GAME, null as any, 0, [new A, new B], [])).not.toThrow();
    });
    test("comps added after init do have to be in dependency order", () => {
        const obj = new GameObjRaw(DUMMY_GAME, null as any, 0, [], []);
        expect(() => obj.use(new A)).toThrow();
    });
    test("comps' properties get added", () => {
        const obj = new GameObjRaw(DUMMY_GAME, null as any, 0, [new C], []) as GameObj<{ foo: number }>;
        expect(obj.foo).toEqual(123);
    });
    test("comps' methods get bound", () => {
        const obj = new GameObjRaw(DUMMY_GAME, null as any, 0, [new D], []) as GameObj<{ foo(): void }>;
        expect.assertions(1);
        obj.foo();
    });
});

describe("removing comps", () => {
    test("removing comp with dependent throws", () => {
        const obj = new GameObjRaw(DUMMY_GAME, null as any, 0, [new A, new B], []);
        expect(() => obj.unuse("test:b")).toThrow();
    });
    test("removing comp that is not depended on works", () => {
        const obj = new GameObjRaw(DUMMY_GAME, null as any, 0, [new A, new B], []);
        expect(() => obj.unuse("test:a")).not.toThrow();
    });
    test("removing comp removes properties", () => {
        const obj = new GameObjRaw(DUMMY_GAME, null as any, 0, [new C], []) as GameObj<{ foo: number }>;
        expect(obj).toHaveProperty("foo");
        obj.unuse("test:c");
        expect(obj).not.toHaveProperty("foo");
    })
});
