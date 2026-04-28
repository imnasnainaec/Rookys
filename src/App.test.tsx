import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";
import { architectureModules } from "./modules";

describe("App", () => {
  it("renders scaffold copy and all architecture module boundaries", () => {
    const { container } = render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Rookys Platform Foundation",
      }),
    ).toBeTruthy();

    const list = container.querySelector("section.card ul");
    expect(list).toBeTruthy();

    const listItems = within(list as HTMLUListElement).getAllByRole("listitem");
    expect(listItems).toHaveLength(architectureModules.length);

    architectureModules.forEach(({ name, description }) => {
      expect(screen.getByText(name)).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
    });
  });
});