import { createDOM } from "@builder.io/qwik/testing";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renders the label", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" />);
    expect(screen.querySelector("label")!.textContent).toBe("Username");
  });

  it("associates the label with the input via htmlFor/id", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" />);
    const label = screen.querySelector("label")!;
    const input = screen.querySelector("input")!;
    expect(label.getAttribute("for")).toBe(input.id);
  });

  it("does not show an error message by default", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" />);
    expect(screen.querySelector("p")).toBeFalsy();
  });

  it("shows the error message when provided", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" error="Invalid format" />);
    expect(screen.querySelector("p")!.textContent).toBe("Invalid format");
  });

  it("sets aria-invalid when an error is present", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" error="Invalid format" />);
    const input = screen.querySelector("input")!;
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("does not set aria-invalid without an error", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" />);
    const input = screen.querySelector("input")!;
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("links the error message via aria-describedby", async () => {
    const { screen, render } = await createDOM();
    await render(<Input label="Username" name="username" error="Invalid format" />);
    const input = screen.querySelector("input")!;
    const error = screen.querySelector("p")!;
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });
});
