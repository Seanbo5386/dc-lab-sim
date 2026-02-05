// src/components/__tests__/XidErrorReference.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { XidErrorReference } from "../XidErrorReference";

describe("XidErrorReference", () => {
  it("renders the component heading", () => {
    render(<XidErrorReference />);
    expect(screen.getByText("XID Error Reference")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<XidErrorReference />);
    expect(screen.getByPlaceholderText(/search xid/i)).toBeInTheDocument();
  });

  it("renders severity filter buttons", () => {
    render(<XidErrorReference />);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /critical/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /warning/i }),
    ).toBeInTheDocument();
  });

  it("displays XID error entries", () => {
    render(<XidErrorReference />);
    expect(screen.getByText(/XID 13/)).toBeInTheDocument();
    expect(screen.getByText(/XID 48/)).toBeInTheDocument();
    expect(screen.getByText(/XID 79/)).toBeInTheDocument();
  });

  it("filters by severity when button clicked", () => {
    render(<XidErrorReference />);
    fireEvent.click(screen.getByRole("button", { name: /critical/i }));
    expect(screen.getByText(/XID 48/)).toBeInTheDocument(); // Critical
    expect(screen.getByText(/XID 79/)).toBeInTheDocument(); // Critical
  });

  it("filters by search query", () => {
    render(<XidErrorReference />);
    const searchInput = screen.getByPlaceholderText(/search xid/i);
    fireEvent.change(searchInput, { target: { value: "ECC" } });
    expect(screen.getByText(/XID 48/)).toBeInTheDocument();
    expect(screen.getByText(/XID 63/)).toBeInTheDocument();
  });

  it("shows exam relevance tag on relevant errors", () => {
    render(<XidErrorReference />);
    expect(screen.getAllByText(/exam relevant/i).length).toBeGreaterThan(0);
  });
});
