import { Color } from "@r47onfire/game-math";
import { BlendMode, Uniforms } from "./Shader";

export interface RenderModifiers {
    tex?: string,
    /** default is WHITE */
    color?: Color,
    /** default is 1 */
    opacity?: number,
    shader?: string,
    uniforms?: Uniforms,
    blend?: BlendMode,
    fixed?: boolean,
}
