import { InputType, InputEventEntry } from "../../InputSource";
import { WrappedGamepad } from "../WrappedGamepad";
import { GamepadDriver } from "./GamepadDriver";
import { DS5_ID } from "./mappings";

export class PS5HIDDriver extends GamepadDriver {
    static matches(id: string) {
        return id === DS5_ID;
    }
    read(gamepad: WrappedGamepad, into: { [T in InputType]: InputEventEntry<T>[]; }): void {

    }
    canUpgrade(): boolean {
        return true;
    }
    async activate() {
        // TODO
    }
}
