const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

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
		const match = DATE_REGEX.exec(dateString);
		if (!match) {
			return null;
		}
		const [_, year, month, day, hour, minute, second] = match;
		const parsed = new Date(
			Number(year),
			Number(month) - 1,
			Number(day),
			Number(hour),
			Number(minute),
			Number(second),
		);
		if (Number.isNaN(parsed.getTime())) {
			return null;
		}

		const diffMs = parsed.getTime() - now.getTime();
		const diffSeconds = Math.round(diffMs / 1000);
		const absSeconds = Math.abs(diffSeconds);
		const isFuture = diffSeconds > 0;

		const format = (value: number, unit: string, singular: string) => {
			if (value === 1) {
				return isFuture ? `in ${singular}` : `${singular} ago`;
			}
			return isFuture ? `in ${value} ${unit}` : `${value} ${unit} ago`;
		};

		if (absSeconds < 45) {
			return isFuture ? "in a few seconds" : "a few seconds ago";
		}
		const minutes = Math.round(absSeconds / 60);
		if (minutes <= 1) {
			return format(1, "minutes", "a minute");
		}
		if (minutes < 45) {
			return format(minutes, "minutes", "a minute");
		}
		const hours = Math.round(minutes / 60);
		if (hours <= 1) {
			return format(1, "hours", "an hour");
		}
		if (hours < 22) {
			return format(hours, "hours", "an hour");
		}
		const days = Math.round(hours / 24);
		if (days <= 1) {
			return format(1, "days", "a day");
		}
		if (days < 26) {
			return format(days, "days", "a day");
		}
		const months = Math.round(days / 30);
		if (months <= 1) {
			return format(1, "months", "a month");
		}
		if (months < 12) {
			return format(months, "months", "a month");
		}
		const years = Math.round(months / 12);
		return format(years, "years", "a year");
	} catch {
		return null;
	}
};

export const renderStatusBarTemplate = (template: string, context: TemplateContext): string => {
	const hasBraces = template.includes("{") || template.includes("}");
	let hasInvalidToken = false;
	const resolved = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
		if (key in context) {
			return context[key as keyof TemplateContext];
		}
		hasInvalidToken = true;
		return "";
	});
	if (hasInvalidToken) {
		return "";
	}
	if (hasBraces && /[{}]/.test(resolved)) {
		return "";
	}
	const trimmed = resolved.trim();
	return trimmed.length > 0 ? trimmed : "";
};
