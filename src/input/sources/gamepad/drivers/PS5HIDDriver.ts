import { InputEventEntry, InputType } from "../../InputSource";
import { WrappedGamepad } from "../WrappedGamepad";
import { GamepadDriver } from "./GamepadDriver";
import { DUALSENSE_MAPPING } from "./mappings";
import { mappingMatches } from "./WebGamepadAPIDriver";

export class PS5HIDDriver extends GamepadDriver {
    static matches(id: string) {
        return mappingMatches(id, DUALSENSE_MAPPING);
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
