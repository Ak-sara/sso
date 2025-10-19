/**
 * Advanced SCIM Filter Parser
 * Supports: eq, ne, co, sw, ew, gt, ge, lt, le, pr, and, or, not
 * Based on RFC 7644 Section 3.4.2.2
 */

export interface FilterNode {
	type: 'comparison' | 'logical' | 'presence';
	operator?: string;
	attribute?: string;
	value?: any;
	left?: FilterNode;
	right?: FilterNode;
}

/**
 * Parse SCIM filter expression into AST
 * Examples:
 *   userName eq "john.doe"
 *   active eq true and emails[type eq "work"].value co "@company.com"
 *   name.familyName co "Smith" or name.givenName co "John"
 */
export function parseScimFilter(filter: string): FilterNode {
	const tokens = tokenize(filter);
	return parseExpression(tokens);
}

/**
 * Tokenize filter string
 */
function tokenize(filter: string): string[] {
	// Regex to match operators, parentheses, brackets, quoted strings, and words
	const regex = /\s*(and|or|not|eq|ne|co|sw|ew|gt|ge|lt|le|pr|[()\[\]]|"[^"]*"|[^\s()[\]]+)\s*/gi;
	const tokens: string[] = [];
	let match;

	while ((match = regex.exec(filter)) !== null) {
		if (match[1]) {
			tokens.push(match[1]);
		}
	}

	return tokens;
}

/**
 * Parse expression (handles 'and', 'or')
 */
function parseExpression(tokens: string[]): FilterNode {
	let left = parseTerm(tokens);

	while (tokens.length > 0 && (tokens[0].toLowerCase() === 'and' || tokens[0].toLowerCase() === 'or')) {
		const operator = tokens.shift()!.toLowerCase();
		const right = parseTerm(tokens);

		left = {
			type: 'logical',
			operator,
			left,
			right
		};
	}

	return left;
}

/**
 * Parse term (handles comparisons and 'not')
 */
function parseTerm(tokens: string[]): FilterNode {
	if (tokens[0] === '(') {
		tokens.shift(); // consume '('
		const node = parseExpression(tokens);
		tokens.shift(); // consume ')'
		return node;
	}

	if (tokens[0].toLowerCase() === 'not') {
		tokens.shift(); // consume 'not'
		const node = parseTerm(tokens);
		return {
			type: 'logical',
			operator: 'not',
			left: node
		};
	}

	return parseComparison(tokens);
}

/**
 * Parse comparison (handles eq, ne, co, sw, etc.)
 */
function parseComparison(tokens: string[]): FilterNode {
	const attribute = tokens.shift()!;

	// Handle 'pr' (presence) operator
	if (tokens[0]?.toLowerCase() === 'pr') {
		tokens.shift();
		return {
			type: 'presence',
			attribute
		};
	}

	const operator = tokens.shift()!.toLowerCase();
	let value = tokens.shift()!;

	// Remove quotes from string values
	if (value.startsWith('"') && value.endsWith('"')) {
		value = value.slice(1, -1);
	}

	// Convert to proper type
	let typedValue: any = value;
	if (value === 'true') typedValue = true;
	else if (value === 'false') typedValue = false;
	else if (value === 'null') typedValue = null;
	else if (!isNaN(Number(value))) typedValue = Number(value);

	return {
		type: 'comparison',
		operator,
		attribute,
		value: typedValue
	};
}

/**
 * Convert filter AST to MongoDB query
 */
export function filterToMongoQuery(node: FilterNode): any {
	if (node.type === 'comparison') {
		const { operator, attribute, value } = node;

		// Handle nested attributes (e.g., "name.familyName")
		const field = attribute!.replace(/\[.*\]/, ''); // Remove array filters for now

		switch (operator) {
			case 'eq':
				return { [field]: value };
			case 'ne':
				return { [field]: { $ne: value } };
			case 'co': // contains
				return { [field]: { $regex: value, $options: 'i' } };
			case 'sw': // starts with
				return { [field]: { $regex: `^${value}`, $options: 'i' } };
			case 'ew': // ends with
				return { [field]: { $regex: `${value}$`, $options: 'i' } };
			case 'gt':
				return { [field]: { $gt: value } };
			case 'ge':
				return { [field]: { $gte: value } };
			case 'lt':
				return { [field]: { $lt: value } };
			case 'le':
				return { [field]: { $lte: value } };
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}
	}

	if (node.type === 'presence') {
		return { [node.attribute!]: { $exists: true, $ne: null } };
	}

	if (node.type === 'logical') {
		const { operator, left, right } = node;

		switch (operator) {
			case 'and':
				return { $and: [filterToMongoQuery(left!), filterToMongoQuery(right!)] };
			case 'or':
				return { $or: [filterToMongoQuery(left!), filterToMongoQuery(right!)] };
			case 'not':
				return { $not: filterToMongoQuery(left!) };
			default:
				throw new Error(`Unsupported logical operator: ${operator}`);
		}
	}

	throw new Error('Invalid filter node');
}

/**
 * Map SCIM attributes to database fields
 */
const ATTRIBUTE_MAP: Record<string, string> = {
	// User attributes
	userName: 'email',
	'name.givenName': 'firstName',
	'name.familyName': 'lastName',
	'name.formatted': 'fullName',
	'emails[primary eq true].value': 'email',
	'emails.value': 'email',
	active: 'status',
	externalId: 'employeeId',

	// Enterprise User attributes
	'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:employeeNumber': 'employeeId',
	'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department': 'assignment.unitId',
	'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager.value': 'assignment.managerId',

	// Group attributes
	displayName: 'name',

	// Custom extensions
	'x-position.isManager': 'assignment.position.isManager',
	'x-position.level': 'assignment.position.level'
};

/**
 * Apply attribute mapping to filter
 */
export function mapFilterAttributes(node: FilterNode): FilterNode {
	if (node.type === 'comparison' || node.type === 'presence') {
		const mappedAttribute = ATTRIBUTE_MAP[node.attribute!] || node.attribute!;
		return { ...node, attribute: mappedAttribute };
	}

	if (node.type === 'logical') {
		return {
			...node,
			left: node.left ? mapFilterAttributes(node.left) : undefined,
			right: node.right ? mapFilterAttributes(node.right) : undefined
		};
	}

	return node;
}

/**
 * Parse and convert SCIM filter to MongoDB query
 */
export function parseScimFilterToMongo(filter: string): any {
	try {
		const ast = parseScimFilter(filter);
		const mappedAst = mapFilterAttributes(ast);
		const mongoQuery = filterToMongoQuery(mappedAst);

		// Handle special 'active' field conversion
		if (JSON.stringify(mongoQuery).includes('"status"')) {
			const queryStr = JSON.stringify(mongoQuery);
			const convertedQuery = JSON.parse(
				queryStr
					.replace(/"status":\s*true/g, '"status":"active"')
					.replace(/"status":\s*false/g, '"status":{"$ne":"active"}')
			);
			return convertedQuery;
		}

		return mongoQuery;
	} catch (error: any) {
		throw new Error(`Invalid SCIM filter: ${error.message}`);
	}
}

/**
 * Test filter parser
 */
if (import.meta.vitest) {
	const { test, expect } = import.meta.vitest;

	test('parse simple eq filter', () => {
		const filter = 'userName eq "john.doe@example.com"';
		const query = parseScimFilterToMongo(filter);
		expect(query).toEqual({ email: 'john.doe@example.com' });
	});

	test('parse co (contains) filter', () => {
		const filter = 'name.familyName co "Smith"';
		const query = parseScimFilterToMongo(filter);
		expect(query).toEqual({ lastName: { $regex: 'Smith', $options: 'i' } });
	});

	test('parse sw (starts with) filter', () => {
		const filter = 'userName sw "john"';
		const query = parseScimFilterToMongo(filter);
		expect(query).toEqual({ email: { $regex: '^john', $options: 'i' } });
	});

	test('parse and operator', () => {
		const filter = 'active eq true and userName co "john"';
		const query = parseScimFilterToMongo(filter);
		expect(query).toHaveProperty('$and');
		expect(query.$and).toHaveLength(2);
	});

	test('parse or operator', () => {
		const filter = 'name.familyName co "Smith" or name.givenName co "John"';
		const query = parseScimFilterToMongo(filter);
		expect(query).toHaveProperty('$or');
		expect(query.$or).toHaveLength(2);
	});

	test('parse pr (presence) operator', () => {
		const filter = 'emails pr';
		const query = parseScimFilterToMongo(filter);
		expect(query).toEqual({ email: { $exists: true, $ne: null } });
	});

	test('parse complex filter with parentheses', () => {
		const filter = '(active eq true and userName co "john") or externalId pr';
		const query = parseScimFilterToMongo(filter);
		expect(query).toHaveProperty('$or');
	});
}
