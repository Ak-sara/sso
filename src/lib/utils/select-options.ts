/**
 * Reusable helper for getting select options from database collections
 * Used in forms/editing for dropdowns and selects
 */

import { getDB } from '$lib/db/connection';
import type { Filter } from 'mongodb';
import { ObjectId } from 'mongodb';

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
	group?: string;
}

export interface GetOptionsParams {
	collection: string;
	valueField?: string; // Default: '_id'
	labelField?: string; // Default: 'name'
	filter?: Filter<any>;
	sort?: Record<string, 1 | -1>;
	excludeIds?: string[]; // Exclude specific IDs
	addEmpty?: boolean; // Add "-- Select --" option
	emptyLabel?: string;
}

/**
 * Generic function to fetch select options from any collection
 *
 * @example
 * // Get all organizations
 * const orgOptions = await getSelectOptions({
 *   collection: 'organizations',
 *   labelField: 'name',
 *   valueField: '_id'
 * });
 *
 * @example
 * // Get active org units, exclude current one
 * const parentOptions = await getSelectOptions({
 *   collection: 'org_units',
 *   filter: { isActive: true },
 *   excludeIds: [currentUnitId],
 *   addEmpty: true,
 *   emptyLabel: '-- No Parent --'
 * });
 */
export async function getSelectOptions(params: GetOptionsParams): Promise<SelectOption[]> {
	const {
		collection,
		valueField = '_id',
		labelField = 'name',
		filter = {},
		sort = { [labelField]: 1 },
		excludeIds = [],
		addEmpty = false,
		emptyLabel = '-- Select --'
	} = params;

	const db = getDB();

	// Add exclusion filter if provided
	const finalFilter = { ...filter };
	if (excludeIds.length > 0) {
		finalFilter._id = { $nin: excludeIds.map(id => new ObjectId(id)) };
	}

	const docs = await db
		.collection(collection)
		.find(finalFilter)
		.sort(sort)
		.toArray();

	const options: SelectOption[] = docs.map((doc) => ({
		value: valueField === '_id' ? doc._id.toString() : doc[valueField],
		label: doc[labelField] || doc.name || 'Unnamed'
	}));

	// Add empty option at the beginning if requested
	if (addEmpty) {
		options.unshift({
			value: '',
			label: emptyLabel
		});
	}

	return options;
}

/**
 * Get parent org unit options (for editing org_units)
 * Excludes the current unit and its children to prevent circular references
 *
 * @param currentUnitId - ID of the unit being edited (to exclude it)
 * @param organizationId - Filter by organization (optional)
 * @returns Array of select options
 */
export async function getOrgUnitParentOptions(
	currentUnitId?: string,
	organizationId?: string
): Promise<SelectOption[]> {
	const db = getDB();

	// Build filter
	const filter: Filter<any> = { isActive: true };
	if (organizationId) {
		// Try to match as both string and ObjectId
		try {
			filter.$or = [
				{ organizationId: organizationId }, // As string
				{ organizationId: new ObjectId(organizationId) } // As ObjectId
			];
		} catch {
			// If invalid ObjectId format, just use string
			filter.organizationId = organizationId;
		}
	}

	console.log('[getOrgUnitParentOptions] Filter:', JSON.stringify(filter), 'orgId:', organizationId);

	// Get all units first
	const allUnits = await db
		.collection('org_units')
		.find(filter)
		.sort({ level: 1, sortOrder: 1, name: 1 })
		.toArray();

	console.log(`[getOrgUnitParentOptions] Found ${allUnits.length} units from DB`);

	// If editing, exclude current unit and its descendants
	let excludeIds: string[] = [];
	if (currentUnitId) {
		excludeIds = [currentUnitId];

		// Find all descendants recursively
		const findDescendants = (parentId: string) => {
			const children = allUnits.filter(
				(u) => u.parentId?.toString() === parentId
			);
			children.forEach((child) => {
				const childId = child._id.toString();
				excludeIds.push(childId);
				findDescendants(childId);
			});
		};

		findDescendants(currentUnitId);
	}

	// Build options with hierarchy indication
	const options: SelectOption[] = allUnits
		.filter((unit) => !excludeIds.includes(unit._id.toString()))
		.map((unit) => {
			// Add indentation based on level
			const indent = '  '.repeat(unit.level || 0);
			const typeLabel = unit.type ? ` (${unit.type})` : '';

			return {
				value: unit._id.toString(),
				label: `${indent}${unit.name}${typeLabel}`
			};
		});

	// Add "No Parent" option at the beginning
	options.unshift({
		value: '',
		label: '-- No Parent (Top Level) --'
	});

	console.log(`[getOrgUnitParentOptions] DB units: ${allUnits.length}, Excluded: ${excludeIds.length}, Final options: ${options.length}`);
	if (allUnits.length === 0) {
		console.warn('⚠️ No units found in DB! Check filter:', filter);
	}

	return options;
}

/**
 * Get organization options
 */
export async function getOrganizationOptions(): Promise<SelectOption[]> {
	return getSelectOptions({
		collection: 'organizations',
		filter: { isActive: true },
		sort: { name: 1 },
		addEmpty: false
	});
}

/**
 * Get position options
 */
export async function getPositionOptions(organizationId?: string): Promise<SelectOption[]> {
	const filter: Filter<any> = { isActive: true };
	if (organizationId) {
		filter.organizationId = organizationId;
	}

	return getSelectOptions({
		collection: 'positions',
		filter,
		sort: { level: 1, name: 1 },
		addEmpty: true,
		emptyLabel: '-- Select Position --'
	});
}

/**
 * Get identity options (for manager selection, etc.)
 *
 * @param organizationId - Filter by organization
 * @param identityType - Filter by type (employee, partner, etc.)
 * @returns Array of select options with full name as label
 */
export async function getIdentityOptions(
	organizationId?: string,
	identityType: string = 'employee'
): Promise<SelectOption[]> {
	const filter: Filter<any> = {
		isActive: true,
		identityType
	};

	if (organizationId) {
		filter.organizationId = organizationId;
	}

	return getSelectOptions({
		collection: 'identities',
		filter,
		labelField: 'fullName',
		sort: { fullName: 1 },
		addEmpty: true,
		emptyLabel: '-- Select Employee --'
	});
}
