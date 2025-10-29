import type { OrgStructureVersion } from '$lib/db/schemas';

type OrgUnit = OrgStructureVersion['structure']['orgUnits'][0];
type MermaidConfig = NonNullable<OrgStructureVersion['mermaidConfig']>;

/**
 * Build default Mermaid configuration from organizational structure
 * Automatically detects directors, divisions, SBUs and creates logical groupings
 *
 * @param orgUnits Array of organizational units
 * @returns Default mermaid configuration with logical groups and styling
 */
export function buildDefaultMermaidConfig(orgUnits: OrgUnit[]): MermaidConfig {
	const unitMap = new Map(orgUnits.map(u => [u._id, u]));
	const unitByCode = new Map(orgUnits.map(u => [u.code, u]));
	const childrenMap = new Map<string, OrgUnit[]>();

	// Build children map
	for (const unit of orgUnits) {
		if (unit.parentId) {
			if (!childrenMap.has(unit.parentId)) {
				childrenMap.set(unit.parentId, []);
			}
			childrenMap.get(unit.parentId)!.push(unit);
		}
	}

	const config: MermaidConfig = {
		logicalGroups: [],
		specialConnections: [],
		nodeStyles: {},
	};

	// Find key units
	const du = unitByCode.get('DU'); // Direktur Utama
	const dc = unitByCode.get('DC'); // Direktur Komersial
	const sbucl = unitByCode.get('SBUCL'); // SBU Cargo & Logistics

	if (!du) {
		// No DU found, return simple config
		return config;
	}

	// Get all directors under DU
	const directors = (childrenMap.get(du._id) || []).filter(u => u.type === 'directorate');

	// Collect all division codes across all directors
	const allDivisionCodes: string[] = [];

	// Create logical groups for each director's divisions
	for (const director of directors) {
		const divisions = childrenMap.get(director._id) || [];

		if (divisions.length > 0) {
			const divisionCodes = divisions.map(d => d.code);
			allDivisionCodes.push(...divisionCodes);

			// Create a logical group for this director's divisions
			// DD + director code (e.g., DDC, DDO, DDR)
			config.logicalGroups.push({
				id: `DD${director.code}`,
				label: '',
				type: 'positioning',
				direction: 'LR',
				contains: divisionCodes,
				styling: { transparent: true },
			});
		}
	}

	// Create wrapper group DIR that contains all directorate divisions
	if (allDivisionCodes.length > 0) {
		config.logicalGroups.unshift({
			id: 'DIR',
			label: '',
			type: 'wrapper',
			contains: allDivisionCodes,
			styling: { transparent: true },
		});
	}

	// Add special connections
	// BOD --> SBUCL (if SBU exists)
	if (sbucl) {
		config.specialConnections.push({
			from: 'BOD',
			to: 'SBUCL',
			type: 'hierarchy',
		});

		// DC -.-> SBUCL (matrix reporting)
		if (dc) {
			config.specialConnections.push({
				from: 'DC',
				to: 'SBUCL',
				type: 'matrix',
			});
		}
	}

	// Apply IAS standard styling
	config.nodeStyles = buildIASNodeStyles(orgUnits);

	return config;
}

/**
 * Build IAS standard node styles (color classes)
 * Based on the example org structure
 */
function buildIASNodeStyles(orgUnits: OrgUnit[]): Record<string, { shape?: string; cssClass?: string }> {
	const styles: Record<string, { shape?: string; cssClass?: string }> = {};

	for (const unit of orgUnits) {
		// Directors = teal
		if (['DU', 'DC', 'DO', 'DR', 'DK', 'DH'].includes(unit.code)) {
			styles[unit.code] = { cssClass: 's-teal' };
		}

		// SDU units = green
		if (unit.code.startsWith('S') && ['SPMO', 'SACA', 'SAM', 'SERP', 'SAS', 'SFM', 'SHO'].includes(unit.code)) {
			styles[unit.code] = { cssClass: 's-green' };
		}

		// SEGM (if exists) = blue
		if (unit.code === 'SEGM') {
			styles[unit.code] = { cssClass: 's-blue' };
		}

		// Band 1 divisions (divisions under directors) = yellow
		if (unit.type === 'division' && unit.level === 3) {
			styles[unit.code] = { cssClass: 's-yellow' };
		}

		// Departments under SBU divisions = stadium shape
		if (unit.type === 'department' && unit.level >= 4) {
			styles[unit.code] = { shape: 'stadium' };
		}
	}

	return styles;
}

/**
 * Build Mermaid config for SBU internal structure
 * Creates nested logical groups for SBU divisions
 */
export function buildSBUConfig(sbucl: OrgUnit, orgUnits: OrgUnit[]): MermaidConfig['logicalGroups'] {
	const childrenMap = new Map<string, OrgUnit[]>();

	for (const unit of orgUnits) {
		if (unit.parentId) {
			if (!childrenMap.has(unit.parentId)) {
				childrenMap.set(unit.parentId, []);
			}
			childrenMap.get(unit.parentId)!.push(unit);
		}
	}

	const logicalGroups: MermaidConfig['logicalGroups'] = [];

	// Get divisions under SBU
	const sbuDivisions = childrenMap.get(sbucl._id) || [];

	for (const division of sbuDivisions) {
		// Get departments under this division
		const departments = childrenMap.get(division._id) || [];

		if (departments.length > 0) {
			// Create logical group for this division's departments
			// e.g., CSG for Cargo Service, LOGG for Logistics
			const groupId = division.code === 'SCS' ? 'CSG' :
			                division.code === 'LOG' ? 'LOGG' :
			                division.code === 'CBE' ? 'CBEG' :
			                division.code === 'CLS' ? 'CLSG' :
			                `${division.code}G`;

			logicalGroups.push({
				id: groupId,
				label: '',
				type: 'positioning',
				contains: departments.map(d => d.code),
				styling: { transparent: true },
			});
		}
	}

	return logicalGroups;
}

/**
 * Clone mermaid config from another version
 */
export function cloneMermaidConfig(sourceConfig: MermaidConfig): MermaidConfig {
	return JSON.parse(JSON.stringify(sourceConfig));
}

/**
 * Validate mermaid config
 * Checks that all unit codes referenced in config actually exist
 */
export function validateMermaidConfig(
	config: MermaidConfig,
	orgUnits: OrgUnit[]
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const unitCodes = new Set(orgUnits.map(u => u.code));

	// Check logical groups
	for (const group of config.logicalGroups) {
		for (const code of group.contains) {
			if (!unitCodes.has(code)) {
				errors.push(`Logical group "${group.id}" references non-existent unit: ${code}`);
			}
		}
	}

	// Check special connections
	for (const conn of config.specialConnections) {
		if (!unitCodes.has(conn.from) && !config.logicalGroups.find(g => g.id === conn.from)) {
			errors.push(`Connection references non-existent unit: ${conn.from}`);
		}
		if (!unitCodes.has(conn.to) && !config.logicalGroups.find(g => g.id === conn.to)) {
			errors.push(`Connection references non-existent unit: ${conn.to}`);
		}
	}

	// Check node styles
	for (const code of Object.keys(config.nodeStyles)) {
		if (!unitCodes.has(code)) {
			errors.push(`Node style references non-existent unit: ${code}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
