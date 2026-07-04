import { Vec2, Vec2_length_squared, Vec2_set } from "@r47onfire/game-math";
import { keys } from "lib0/object";
import { GamepadButton } from "../../../types/Gamepad";
import { InputEventEntry, InputType } from "../../InputSource";
import { GamepadMapping, GamepadOptions } from "../GamepadSource";
import { WrappedGamepad } from "../WrappedGamepad";
import { GamepadDriver } from "./GamepadDriver";
import { extractVidPid } from "./HIDNumbers";
import { DEFAULT_MAPPING, KNOWN_NON_DEFAULT_MAPPINGS } from "./mappings";

export class WebGamepadAPIDriver extends GamepadDriver {
    #map: GamepadMapping;
    constructor(gamepad: Gamepad, options: GamepadOptions) {
        super(gamepad, options);
        this.#map = findMapping(gamepad.id, options.gamepadMappings);
        console.log("web gamepad found mapping for", gamepad.id, this.#map);
    }
    #prevValues = new Map<GamepadButton, number>();
    read(gamepad: WrappedGamepad, values: { [T in InputType]: InputEventEntry<T>[]; }) {
        const browserGamepad = navigator.getGamepads()[this.index];
        if (!browserGamepad || !browserGamepad.connected) return;
        const map = this.#map;
        var i;
        for (i = 0; i < browserGamepad.buttons.length; i++) {
            const gamepadBtn = map.buttons[i]!;
            // TODO: touched? : possibly could be supported on 2026 steam controller and I don't have one :(
            const { value } = browserGamepad.buttons[i]!;

            const buttonName = `gamepad/${gamepadBtn}` as const;
            const oldValue = this.#prevValues.get(buttonName);
            var semantic;
            if (oldValue !== value) semantic = "gamepad" as const;
            values[InputType.SCALAR].push([semantic, buttonName, value]);
            this.#prevValues.set(buttonName, value);
        }

        const stickNames = keys(map.sticks) as (keyof GamepadMapping["sticks"])[];
        for (i = 0; i < stickNames.length; i++) {
            const stickName = stickNames[i]!;
            const stick = map.sticks[stickName]!;
            const value = new Vec2(
                browserGamepad.axes[stick.x],
                browserGamepad.axes[stick.y],
            );
            var semantic;
            if (Vec2_length_squared(value) < (gamepad.deadzone ** 2)) {
                Vec2_set(value, 0, 0);
            } else {
                semantic = "gamepad" as const;
            }
            values[InputType.DIRECTION].push([semantic, `gamepad/${stickName}` as const, value]);
        }
    }
    canUpgrade = () => false;
    activate = () => Promise.resolve();
    static matches = () => true;
}

const findMapping = (gamepadID: string, customMappings?: GamepadMapping[]) => {
    return (customMappings && findMappingIn(gamepadID, customMappings)) ?? findMappingIn(gamepadID, KNOWN_NON_DEFAULT_MAPPINGS) ?? DEFAULT_MAPPING;
};

const findMappingIn = (id: string, mappings: GamepadMapping[]) => {
    id = id.toLowerCase();
    for (var mapping of mappings) {
        if (mappingMatches(id, mapping)) return mapping;
    }
    return null;
}

export const mappingMatches = (id: string, mapping: GamepadMapping) => {
    const vidPid = extractVidPid(id);
    const { vidPid: mapVidPid, names } = mapping;
    if (vidPid && vidPid[0] === mapVidPid[0] && (mapVidPid[1] === undefined || mapVidPid[1].includes(vidPid[1]))) return true;
    if (names.length && names.some(name => id.includes(name))) return true;
    return false;
}

