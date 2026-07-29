import { createDOM } from "@builder.io/qwik/testing";
import { describe, expect, it } from "vitest";
import { Button, type ButtonVariant } from "./button";

describe("Button", () => {
  const variants: ButtonVariant[] = ["primary", "secondary", "danger"];

  for (const variant of variants) {
    it(`renders the ${variant} variant`, async () => {
      const { screen, render } = await createDOM();
      await render(<Button label="Click me" variant={variant} />);
      const button = screen.querySelector("button")!;
      expect(button.textContent).toBe("Click me");
    });
  }

  it("defaults to the primary variant", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Default" />);
    const button = screen.querySelector("button")!;
    expect(button.className).toContain("bg-primary");
  });

  it("shows a loading indicator instead of the label", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Submit" loading />);
    const button = screen.querySelector("button")!;
    expect(button.textContent).not.toBe("Submit");
  });

  it("disables the button while loading", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Submit" loading />);
    const button = screen.querySelector("button")!;
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("disables the button when disabled is set", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Submit" disabled />);
    const button = screen.querySelector("button")!;
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("is enabled by default", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Submit" />);
    const button = screen.querySelector("button")!;
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("defaults to type=button", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Submit" />);
    const button = screen.querySelector("button")!;
    expect(button.getAttribute("type")).toBe("button");
  });

  it("supports type=submit", async () => {
    const { screen, render } = await createDOM();
    await render(<Button label="Submit" type="submit" />);
    const button = screen.querySelector("button")!;
    expect(button.getAttribute("type")).toBe("submit");
  });
});
