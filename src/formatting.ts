import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

export interface TemplateContext {
	user: string;
	rank: string;
	score: string;
	team: string;
	teamRank: string;
	teamScore: string;
	lastWork: string;
	updatedAt: string;
}

export const formatNumber = (num: number): string => {
	if (num >= 1000000000000) {
		return `${(num / 1000000000000).toFixed(1)}T`;
	}
	if (num >= 1000000000) {
		return `${(num / 1000000000).toFixed(1)}B`;
	}
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
};

export const formatRelativeTime = (
	dateString: string | undefined,
	now: Date = new Date(),
): string | null => {
	if (!dateString) {
		return null;
	}

	try {
		const parsed = dayjs(dateString, "YYYY-MM-DD HH:mm:ss", true);
		if (!parsed.isValid()) {
			return null;
		}
		return parsed.from(dayjs(now));
	} catch {
		return null;
	}
};

export const renderStatusBarTemplate = (
	template: string,
	context: TemplateContext,
): string => {
	const resolved = template.replace(/\{(\w+)\}/g, (match, key: string) => {
		if (key in context) {
			return context[key as keyof TemplateContext];
		}
		return match;
	});
	const trimmed = resolved.trim();
	return trimmed.length > 0 ? trimmed : "";
};
