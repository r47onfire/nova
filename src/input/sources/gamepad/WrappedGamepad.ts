import { InputEventEntry, InputType } from "../InputSource";
import { GamepadOptions } from "./GamepadSource";
import { WebGamepadAPIDriver } from "./drivers/WebGamepadAPIDriver";
import { GamepadDriver } from "./drivers/GamepadDriver";
import { PS5HIDDriver } from "./drivers/PS5HIDDriver";

const ALL_DRIVERS = [
    WebGamepadAPIDriver,
    PS5HIDDriver,
];

export class WrappedGamepad {
    #drivers: GamepadDriver[];
    deadzone: number;
    constructor(public gamepad: Gamepad, options: GamepadOptions) {
        this.#drivers = ALL_DRIVERS.flatMap(cls => cls.matches(gamepad.id) ? [new cls(gamepad, options)] : []);
        this.deadzone = options.gamepadDeadzone ?? 0.1;
    }
    poll() {
        const out: { [T in InputType]: InputEventEntry<T>[] } = {
            [InputType.SCALAR]: [],
            [InputType.DIRECTION]: [],
            [InputType.POINTER]: []
        };
        this.#drivers.forEach(d => d.read(this, out));
        return out;
    }
    upgradeAvailable() {
        return this.#drivers.some(d => d.canUpgrade());
    }
    upgrade() {
        return Promise.all(this.#drivers.flatMap(d => d.canUpgrade() ? [d.activate()] : []));
    }
}
