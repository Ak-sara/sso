import type { RequestHandler } from './$types';
import { db } from '$lib/db/db';
import { json } from '@sveltejs/kit';

// GET /api/identities/fields - Discover all field paths for masking config
export const GET: RequestHandler = async () => {
	try {
		const identities = await db.identities.col.find({}).limit(200).toArray();
		const allFields = new Set<string>();
		identities.forEach((identity) => extractFields(identity, '', allFields));

		const systemFields = ['_id', 'password', 'identityType', 'isActive', 'isAdmin', 'emailVerified', 'createdAt', 'updatedAt', 'organizationId', 'orgUnitId', 'positionId', 'managerId', 'employmentType', 'employmentStatus', 'workLocation'];
		const maskableFields = Array.from(allFields).filter((f) => !systemFields.includes(f)).sort();

		return json({ fields: maskableFields, categorized: categorizeFields(maskableFields), sampleSize: identities.length });
	} catch (err) {
		return json({ error: 'Failed to discover fields' }, { status: 500 });
	}
};

function extractFields(obj: any, prefix: string, fields: Set<string>, maxDepth = 3): void {
	if (!obj || typeof obj !== 'object' || maxDepth === 0 || Array.isArray(obj)) return;
	for (const key in obj) {
		if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
		const fieldPath = prefix ? `${prefix}.${key}` : key;
		fields.add(fieldPath);
		if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
			extractFields(obj[key], fieldPath, fields, maxDepth - 1);
		}
	}
}

function categorizeFields(fields: string[]): Record<string, string[]> {
	const categories: Record<string, string[]> = {
		'Personal Information': [],
		'Contact Information': [],
		'Employment Information': [],
		'Custom Properties': [],
		'Other': []
	};
	fields.forEach((field) => {
		const lowerField = field.toLowerCase();
		if (field.startsWith('customProperties.')) categories['Custom Properties'].push(field);
		else if (['name', 'birth', 'dob', 'age', 'gender', 'ktp', 'nik', 'passport'].some((kw) => lowerField.includes(kw))) categories['Personal Information'].push(field);
		else if (['email', 'phone', 'mobile', 'address', 'city', 'postal'].some((kw) => lowerField.includes(kw))) categories['Contact Information'].push(field);
		else if (['employee', 'join', 'contract', 'salary', 'position', 'title'].some((kw) => lowerField.includes(kw))) categories['Employment Information'].push(field);
		else categories['Other'].push(field);
	});
	Object.keys(categories).forEach((key) => { if (categories[key].length === 0) delete categories[key]; });
	return categories;
}
