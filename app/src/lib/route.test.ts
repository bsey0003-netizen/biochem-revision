import { describe, expect, test } from "vitest";
import { parseHash, toHash } from "./route.ts";

describe("route", () => {
  test("parses known views and arguments", () => {
    expect(parseHash("#practice")).toEqual({ name: "practice", arg: null });
    expect(parseHash("#topic/enzymes")).toEqual({ name: "topic", arg: "enzymes" });
    expect(parseHash("#about")).toEqual({ name: "about", arg: null });
  });

  test("falls back to home for unknown or malformed hashes", () => {
    expect(parseHash("")).toEqual({ name: "home", arg: null });
    expect(parseHash("#nope")).toEqual({ name: "home", arg: null });
    expect(parseHash("#topic/%E0%A4%A")).toEqual({ name: "home", arg: null });
  });

  test("toHash encodes arguments and round-trips", () => {
    expect(toHash({ name: "topic", arg: "a b" })).toBe("#topic/a%20b");
    expect(parseHash(toHash({ name: "topic", arg: "a b" }))).toEqual({ name: "topic", arg: "a b" });
    expect(toHash({ name: "home", arg: null })).toBe("#home");
  });
});
