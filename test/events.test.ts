import { expect, mock, test } from "bun:test";
import { STOP_EVENT, SingleEvent } from "../src/events";

test("fires event", () => {
    const handler = mock();
    const event = new SingleEvent<void>();
    event.add(handler);
    event.fire();
    expect(handler).toHaveBeenCalledTimes(1);
});
test("can be paused", () => {
    const handler = mock();
    const event = new SingleEvent<void>();
    const controller = event.add(handler);
    event.fire();
    expect(handler).toHaveBeenCalledTimes(1);
    controller.paused = true;
    event.fire();
    expect(handler).toHaveBeenCalledTimes(1);
    controller.paused = false;
    event.fire();
    expect(handler).toHaveBeenCalledTimes(2);
});
test("can be cancelled", () => {
    const handler = mock();
    const event = new SingleEvent<void>();
    const controller = event.add(handler);
    event.fire();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.size()).toEqual(1);
    controller.stop();
    expect(event.size()).toEqual(0);
    event.fire();
    expect(handler).toHaveBeenCalledTimes(1);
});
test("single events", () => {
    const handler1 = mock();
    const handler2 = mock();
    const event = new SingleEvent<void>();
    event.add(handler1)
    event.addOnce(handler2);
    event.fire();
    event.fire();
    expect(handler1).toHaveBeenCalledTimes(2);
    expect(handler2).toHaveBeenCalledTimes(1);
});
test("async wait for next", async () => {
    const event = new SingleEvent<void>();
    setImmediate(() => event.fire());
    await event.next();
});
test("cancel symbol works to cancel", () => {
    const handler = mock(() => STOP_EVENT);
    const event = new SingleEvent<void>();
    event.add(handler);
    event.fire();
    event.fire();
    expect(handler).toHaveBeenCalledTimes(1);
});
