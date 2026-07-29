import { describe, expect, it } from "vitest";
import { isValidHandle } from "./validation";

describe("isValidHandle", () => {
  it("accepts a well-formed handle", () => {
    expect(isValidHandle("alice@example.com")).toBe(true);
  });

  it("accepts hyphens and underscores in the username", () => {
    expect(isValidHandle("al-ice_2@example.com")).toBe(true);
  });

  it("rejects a missing @", () => {
    expect(isValidHandle("alice.example.com")).toBe(false);
  });

  it("rejects multiple @", () => {
    expect(isValidHandle("alice@ex@ample.com")).toBe(false);
  });

  it("rejects a username shorter than 3 characters", () => {
    expect(isValidHandle("ab@example.com")).toBe(false);
  });

  it("rejects a username made entirely of underscores", () => {
    expect(isValidHandle("___@example.com")).toBe(false);
  });

  it("rejects a server label starting with a hyphen", () => {
    expect(isValidHandle("alice@-example.com")).toBe(false);
  });

  it("rejects an empty server", () => {
    expect(isValidHandle("alice@")).toBe(false);
  });
});
