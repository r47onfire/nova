import { MergeObject } from "../../utils/types";
import { Comp } from "../components/Comp";
import { GameObjRaw } from "./GameObj";

export type GameObj<T = unknown> = GameObjRaw & MergeComps<T>;

type MergeComps<T> = MergeObject<StripCompTypes<T>>;
type StripCompTypes<T> = {
    [K in keyof T]: K extends keyof Comp ? never : T[K];
};
