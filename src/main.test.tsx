import { beforeEach, describe, expect, it, vi } from "vitest";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    renderMock.mockClear();
    createRootMock.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("mounts the app into the root element", async () => {
    await import("./main");

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById("root"),
    );
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
