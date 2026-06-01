import { stringify } from "lib0/json";

export const tsortComps = <T, U>(objects: T[], getID: (obj: T) => U, getDepended: (obj: T) => U[]): T[] => {
    const componentMap = new Map(objects.map(c => [getID(c), c]));
    const sorted: T[] = [];
    const visited = new Set<T>();
    const visiting = new Set<T>();
    const visit = (obj: T) => {
        if (visited.has(obj)) return;
        if (visiting.has(obj)) {
            throw new Error(`Circular dependency detected with ${stringify(getID(obj))}`);
        }
        visiting.add(obj);
        for (var requiredId of getDepended(obj)) {
            const requiredComponent = componentMap.get(requiredId);
            if (requiredComponent) {
                visit(requiredComponent);
            }
        }
        visiting.delete(obj);
        visited.add(obj);
        sorted.push(obj);
    }
    objects.forEach(c => visit(c));
    return sorted;
}
