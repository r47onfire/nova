import { Color } from "@r47onfire/game-math";
import { BlendMode, Uniforms } from "./Shader";

export interface RenderModifiers {
    // referring to it by name, so this can be serialized easier
    tex: string | null;
    color: Color;
    opacity: number;
    blend: BlendMode;
    shader: string | null;
    uniforms: Uniforms;
    fixed: boolean;
}
