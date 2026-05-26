import { Mat23_transformPointV_m, Quad, Vec2, Vec2_set } from "@r47onfire/game-math";
import { Mesh } from "./Mesh";
import { Renderer, StackKind } from "./Renderer";

export interface Vertex {
    [field: string]: number;
}

type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>;

export interface VertexParameter<N extends number> {
    /** The name of the `in xxx` parameter in the vertex shader */
    attr: string;
    /** The name of the fields in the vertex, also determines the size (1=`float`, 2=`vec2`, 3=`vec3`, etc) */
    fields: Tuple<string, N>;
    /** The value to fill with if the field is not found. Default is 0. */
    fill?: number | Tuple<number, N>;
    /** Transforms the value before it gets added to the queue. The data parameter is an inout parameter, should be modified in place. */
    transform?(renderer: Renderer, mesh: Mesh, quad: Quad, data: Tuple<number, N>): void;
}

export type VertexFormat = (VertexParameter<1> | VertexParameter<2> | VertexParameter<3> | VertexParameter<4>)[];

const SCRATCH_POINT = new Vec2;
export const DEFAULT_VERTEX_FORMAT: VertexFormat = [
    {
        attr: "a_pos",
        fields: ["x", "y"],
        fill: 0,
        transform(renderer, _mesh, _quad, data) {
            Vec2_set(SCRATCH_POINT, data[0], data[1]);
            Mat23_transformPointV_m(renderer.get(StackKind.TRANSFORM), SCRATCH_POINT, SCRATCH_POINT);
            data[0] = SCRATCH_POINT.x;
            data[1] = SCRATCH_POINT.y;
        }
    } satisfies VertexParameter<2>,
    {
        attr: "a_uv",
        fields: ["u", "v"],
        fill: Infinity, // we don't know the texture size, so just use Infinity to get the bottom right since it's set to clamp
        transform(_renderer, _mesh, quad, data) {
            data[0] += quad.x;
            data[1] += quad.y;
        },
    } satisfies VertexParameter<2>,
    {
        attr: "a_color",
        fields: ["r", "g", "b", "a"],
        fill: [255, 255, 255, 1],
        transform(_renderer, mesh, _quad, data) {
            // Inline form of Color_mul()
            data[0] *= mesh.color.r / 255;
            data[1] *= mesh.color.g / 255;
            data[2] *= mesh.color.b / 255;
            // Opacity is already normalized to 0-1
            data[3] *= mesh.opacity;
        }
    } satisfies VertexParameter<4>,
];

export const getVertexFormatStride = (format: VertexFormat) => format.reduce((sum, param) => sum + param.fields.length, 0) * 4;
