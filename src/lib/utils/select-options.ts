/**
 * Reusable helper for getting select options from database collections.
 * Used in forms/editing for dropdowns and selects.
 */

import { db, Repository, lazy } from '$lib/db/db';
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
	valueField?: string;
	labelField?: string;
	filter?: Filter<any>;
	sort?: Record<string, 1 | -1>;
	excludeIds?: string[];
	addEmpty?: boolean;
	emptyLabel?: string;
}

/**
 * Generic function to fetch select options from any collection.
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

	const repo = new Repository(lazy, collection);
	const finalFilter: any = { ...filter };
	if (excludeIds.length > 0) {
		finalFilter._id = { $nin: excludeIds.map((id) => new ObjectId(id)) };
	}

	const docs = await repo.col.find(finalFilter).sort(sort).toArray();

	const options: SelectOption[] = docs.map((doc: any) => ({
		value: valueField === '_id' ? doc._id.toString() : doc[valueField],
		label: doc[labelField] || doc.name || 'Unnamed'
	}));

	if (addEmpty) options.unshift({ value: '', label: emptyLabel });
	return options;
}

/**
 * Get parent org unit options, excluding the current unit and its descendants.
 */
export async function getOrgUnitParentOptions(
	currentUnitId?: string,
	organizationId?: string
): Promise<SelectOption[]> {
	const filter: Filter<any> = { isActive: true };
	if (organizationId) {
		try {
			filter.$or = [
				{ organizationId },
				{ organizationId: new ObjectId(organizationId) }
			];
		} catch {
			filter.organizationId = organizationId;
		}
	}

	const allUnits = await db.orgUnits.col.find(filter).toArray();

	let excludeIds: string[] = [];
	if (currentUnitId) {
		excludeIds = [currentUnitId];
		const findDescendants = (parentId: string) => {
			const children = allUnits.filter((u: any) => u.parentId?.toString() === parentId);
			children.forEach((child: any) => {
				const childId = child._id.toString();
				excludeIds.push(childId);
				findDescendants(childId);
			});
		};
		findDescendants(currentUnitId);
	}

	const options: SelectOption[] = allUnits
		.filter((unit: any) => !excludeIds.includes(unit._id.toString()))
		.map((unit: any) => ({
			value: unit._id.toString(),
			label: `${'  '.repeat(unit.level || 0)}${unit.name}${unit.type ? ` (${unit.type})` : ''}`
		}));

	options.unshift({ value: '', label: '-- No Parent (Top Level) --' });
	return options;
}

export async function getOrganizationOptions(): Promise<SelectOption[]> {
	const orgs = await db.organizations.find({ isActive: true } as any, { name: 1 });
	return orgs.map((org: any) => ({ value: org._id.toString(), label: org.name }));
}

export async function getPositionOptions(organizationId?: string): Promise<SelectOption[]> {
	const filter: any = { isActive: true };
	if (organizationId) filter.organizationId = organizationId;
	const positions = await db.positions.find(filter, { level: 1, name: 1 });
	const options = positions.map((p: any) => ({ value: p._id.toString(), label: p.name }));
	options.unshift({ value: '', label: '-- Select Position --' });
	return options;
}

export async function getIdentityOptions(
	organizationId?: string,
	identityType = 'employee'
): Promise<SelectOption[]> {
	const filter: any = { isActive: true, identityType };
	if (organizationId) filter.organizationId = organizationId;
	const identities = await db.identities.find(filter, { fullName: 1 });
	const options = identities.map((i: any) => ({ value: i._id.toString(), label: i.fullName }));
	options.unshift({ value: '', label: '-- Select Employee --' });
	return options;
}
