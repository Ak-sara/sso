/**
 * Pagination utility functions
 */

export interface PaginationParams {
	page: number;
	pageSize: number;
	sortKey?: string;
	sortDirection?: 'asc' | 'desc';
	search?: string;
}

export interface PaginationResult<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, pageSize: number): number {
	return (page - 1) * pageSize;
}

/**
 * Calculate total pages
 */
export function getTotalPages(totalItems: number, pageSize: number): number {
	return Math.ceil(totalItems / pageSize);
}

/**
 * Validate and sanitize pagination params
 */
export function sanitizePaginationParams(params: Partial<PaginationParams>): PaginationParams {
	const page = Math.max(1, parseInt(params.page?.toString() || '1', 10));
	const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize?.toString() || '10', 10)));
	const sortDirection = params.sortDirection === 'desc' ? 'desc' : 'asc';

	return {
		page,
		pageSize,
		sortKey: params.sortKey || undefined,
		sortDirection,
		search: params.search || undefined
	};
}

/**
 * Create pagination result object
 */
export function createPaginationResult<T>(
	data: T[],
	total: number,
	params: PaginationParams
): PaginationResult<T> {
	return {
		data,
		total,
		page: params.page,
		pageSize: params.pageSize,
		totalPages: getTotalPages(total, params.pageSize)
	};
}

/**
 * Client-side pagination (for small datasets)
 */
export function paginateArray<T>(
	array: T[],
	page: number,
	pageSize: number
): PaginationResult<T> {
	const offset = getPaginationOffset(page, pageSize);
	const data = array.slice(offset, offset + pageSize);

	return {
		data,
		total: array.length,
		page,
		pageSize,
		totalPages: getTotalPages(array.length, pageSize)
	};
}

/**
 * Get MongoDB sort object from sort params
 */
export function getMongoSort(sortKey?: string, sortDirection: 'asc' | 'desc' = 'asc'): Record<string, 1 | -1> {
	if (!sortKey) return {};
	return { [sortKey]: sortDirection === 'asc' ? 1 : -1 };
}

/**
 * Build search query for MongoDB (case-insensitive regex)
 */
export function buildSearchQuery(search: string | undefined, fields: string[]): any {
	if (!search || fields.length === 0) return {};

	const regex = { $regex: search, $options: 'i' };
	return {
		$or: fields.map((field) => ({ [field]: regex }))
	};
}
