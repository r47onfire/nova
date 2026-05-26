import { Color } from "@r47onfire/game-math";
import { RenderModifiers } from "./baseProps";
import { BlendMode, Uniforms } from "./Shader";
import { Vertex, VertexFormat } from "./vertex";
import { deepEqual } from "../utils";
import { Renderer } from "./Renderer";

export class Mesh implements RenderModifiers {
    constructor(
        public format: VertexFormat,
        public vertices: Vertex[],
        public indices: number[],
        public tex: string,
        public color: Color,
        public opacity: number,
        public shader: string | null,
        public uniforms: Uniforms,
        public blend: BlendMode,
        public fixed: boolean,
    ) {
    }
}
