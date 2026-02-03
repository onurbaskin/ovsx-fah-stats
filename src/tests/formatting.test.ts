import { describe, expect, test } from "bun:test";
import {
	formatNumber,
	formatRelativeTime,
	renderStatusBarTemplate,
	type TemplateContext,
} from "../formatting";

describe("formatNumber", () => {
	test("formats small numbers without suffix", () => {
		expect(formatNumber(999)).toBe("999");
	});

	test("formats thousands and above with suffixes", () => {
		expect(formatNumber(1500)).toBe("1.5K");
		expect(formatNumber(2_500_000)).toBe("2.5M");
		expect(formatNumber(7_800_000_000)).toBe("7.8B");
		expect(formatNumber(3_400_000_000_000)).toBe("3.4T");
	});
});

describe("formatRelativeTime", () => {
	test("returns relative time for valid dates", () => {
		const now = new Date(2024, 0, 2, 0, 0, 0);
		expect(formatRelativeTime("2024-01-01 00:00:00", now)).toBe("a day ago");
	});

	test("returns null for invalid dates", () => {
		expect(formatRelativeTime("invalid-date")).toBeNull();
	});
});

describe("renderStatusBarTemplate", () => {
	const context: TemplateContext = {
		user: "Donor",
		rank: "123",
		score: "456",
		team: "Team",
		teamRank: "789",
		teamScore: "1011",
		lastWork: "2h ago",
		updatedAt: "Just now",
	};

	test("renders valid templates", () => {
		const rendered = renderStatusBarTemplate(
			"FAH {user} #{rank} • {score}",
			context,
		);
		expect(rendered).toBe("FAH Donor #123 • 456");
	});

	test("fails on unknown tokens", () => {
		const rendered = renderStatusBarTemplate("FAH {user} {missing}", context);
		expect(rendered).toBe("");
	});

	test("fails on unbalanced braces", () => {
		const rendered = renderStatusBarTemplate("FAH {user", context);
		expect(rendered).toBe("");
	});
});
