import type { RequestHandler } from './$types';
import { getDB } from '$lib/db/connection';
import { json } from '@sveltejs/kit';

/**
 * GET /api/identities/fields
 * Discover all field paths in identities collection by scanning sample documents
 * Returns list of available fields that can be masked
 */
export const GET: RequestHandler = async () => {
	try {
		const db = getDB();

		// Sample up to 200 documents to discover fields
		const sampleSize = 200;
		const identities = await db
			.collection('identities')
			.find({})
			.limit(sampleSize)
			.toArray();

		const allFields = new Set<string>();

		// Extract fields from each identity
		identities.forEach((identity) => {
			extractFields(identity, '', allFields);
		});

		// Filter out system fields that shouldn't be masked
		const systemFields = [
			'_id',
			'password',
			'identityType',
			'isActive',
			'roles',
			'emailVerified',
			'createdAt',
			'updatedAt',
			'organizationId',
			'orgUnitId',
			'positionId',
			'managerId',
			'employmentType',
			'employmentStatus',
			'workLocation'
		];

		const maskableFields = Array.from(allFields)
			.filter((field) => !systemFields.includes(field))
			.sort();

		// Group fields by category for better UX
		const categorized = categorizeFields(maskableFields);

		return json({
			fields: maskableFields,
			categorized,
			sampleSize: identities.length
		});
	} catch (error) {
		console.error('Error discovering fields:', error);
		return json({ error: 'Failed to discover fields' }, { status: 500 });
	}
};

/**
 * Recursively extract all field paths from an object
 * @param obj - Object to extract fields from
 * @param prefix - Current path prefix (for nested objects)
 * @param fields - Set to store discovered fields
 * @param maxDepth - Maximum nesting depth to prevent infinite recursion
 */
function extractFields(
	obj: any,
	prefix: string,
	fields: Set<string>,
	maxDepth = 3
): void {
	if (!obj || typeof obj !== 'object' || maxDepth === 0) return;

	// Handle arrays - skip for now (we don't mask array items individually)
	if (Array.isArray(obj)) return;

	for (const key in obj) {
		if (!obj.hasOwnProperty(key)) continue;

		const value = obj[key];
		const fieldPath = prefix ? `${prefix}.${key}` : key;

		// Add this field path
		fields.add(fieldPath);

		// If value is an object (not array), recurse
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			extractFields(value, fieldPath, fields, maxDepth - 1);
		}
	}
}

/**
 * Categorize fields for better UI organization
 */
function categorizeFields(fields: string[]): Record<string, string[]> {
	const categories: Record<string, string[]> = {
		'Personal Information': [],
		'Contact Information': [],
		'Employment Information': [],
		'Custom Properties': [],
		'Other': []
	};

	const personalKeywords = ['name', 'birth', 'dob', 'age', 'gender', 'ktp', 'nik', 'passport'];
	const contactKeywords = ['email', 'phone', 'mobile', 'address', 'city', 'postal'];
	const employmentKeywords = ['employee', 'join', 'contract', 'salary', 'position', 'title'];

	fields.forEach((field) => {
		const lowerField = field.toLowerCase();

		if (field.startsWith('customProperties.')) {
			categories['Custom Properties'].push(field);
		} else if (personalKeywords.some((kw) => lowerField.includes(kw))) {
			categories['Personal Information'].push(field);
		} else if (contactKeywords.some((kw) => lowerField.includes(kw))) {
			categories['Contact Information'].push(field);
		} else if (employmentKeywords.some((kw) => lowerField.includes(kw))) {
			categories['Employment Information'].push(field);
		} else {
			categories['Other'].push(field);
		}
	});

	// Remove empty categories
	Object.keys(categories).forEach((key) => {
		if (categories[key].length === 0) {
			delete categories[key];
		}
	});

	return categories;
}
