import { Comp } from "../components/Comp";
import { GameObjRaw } from "./GameObj";

export type GameObj<T = unknown> = GameObjRaw & MergeComps<T>;

type MergeComps<T> = MergeObject<StripCompTypes<T>>;
type StripCompTypes<T> = {
    [K in keyof T]: K extends keyof Comp ? never : T[K];
};
type Defined<T> = T extends any ? Pick<T, {
    [K in keyof T]-?: T[K] extends undefined ? never : K;
}[keyof T]> : never;
type MergeObject<T> = Expand<UnionToIntersection<Defined<T>>>;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type Expand<T> = T extends infer U ? {
    [K in keyof U]: U[K];
} : never;
