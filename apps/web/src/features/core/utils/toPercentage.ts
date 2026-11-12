export function toPercentage(
	part: number,
	total: number,
	precision: number = 1,
) {
	return total > 0 ? Number(((part / total) * 100).toFixed(precision)) : 0;
}
