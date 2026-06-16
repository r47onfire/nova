import { InputEventEntry, InputType } from "../../InputSource";
import { GamepadOptions } from "../GamepadSource";
import { WrappedGamepad } from "../WrappedGamepad";


export abstract class GamepadDriver {
    protected index: number;
    constructor(gamepad: Gamepad, _: GamepadOptions) {
        this.index = gamepad.index;
    }
    static matches(gamepadID: string): boolean {
        throw new Error("matches() wasn't implemented for " + this.constructor.name);
    }
    abstract read(gamepad: WrappedGamepad, into: { [T in InputType]: InputEventEntry<T>[] }): void;
    abstract canUpgrade(): boolean;
    abstract activate(): Promise<void>;
}
