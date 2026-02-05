// src/components/__tests__/ReferenceTab.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReferenceTab } from "../ReferenceTab";

describe("ReferenceTab", () => {
  it("renders the main heading", () => {
    render(<ReferenceTab />);
    expect(screen.getByText("Reference")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<ReferenceTab />);
    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
  });

  it("renders all 9 task categories", () => {
    render(<ReferenceTab />);
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
    expect(screen.getByText("Diagnose Network Issues")).toBeInTheDocument();
    expect(screen.getByText("Monitor Performance")).toBeInTheDocument();
    expect(screen.getByText("Troubleshoot GPU Problems")).toBeInTheDocument();
    expect(screen.getByText("Manage Cluster Jobs")).toBeInTheDocument();
    expect(screen.getByText("Run Containers")).toBeInTheDocument();
    expect(screen.getByText("Check Hardware Status")).toBeInTheDocument();
    expect(screen.getByText("Configure MIG Partitions")).toBeInTheDocument();
    expect(screen.getByText("Understand Errors")).toBeInTheDocument();
  });

  it("shows category detail view when category clicked", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    expect(
      screen.getByText(/Reference › Check GPU Health/),
    ).toBeInTheDocument();
    expect(screen.getByText(/When to use these tools/i)).toBeInTheDocument();
  });

  it("shows breadcrumb navigation in detail view", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
  });

  it("returns to main view when breadcrumb clicked", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    // Find the breadcrumb "Reference" link and click it
    const breadcrumbs = screen.getAllByText("Reference");
    fireEvent.click(breadcrumbs[0]);
    expect(screen.getByText("What do you want to do?")).toBeInTheDocument();
  });

  it("expands command details when clicked", () => {
    render(<ReferenceTab />);
    fireEvent.click(screen.getByText("Check GPU Health"));
    // First command (nvidia-smi) is auto-expanded, click dcgmi to test manual expansion
    fireEvent.click(screen.getByText("dcgmi"));
    expect(screen.getAllByText("COMMON USAGE").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("KEY OPTIONS").length).toBeGreaterThanOrEqual(1);
  });

  it("filters categories based on search", () => {
    render(<ReferenceTab />);
    const searchInput = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(searchInput, { target: { value: "nvidia-smi" } });
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
    expect(screen.queryByText("Manage Cluster Jobs")).not.toBeInTheDocument();
  });
});
