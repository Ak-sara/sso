import type { OrgStructureVersion } from '$lib/db/schemas';

/**
 * Generate Mermaid flowchart diagram from organizational structure
 * @param version The organization structure version
 * @returns Mermaid diagram as string
 */
export function generateOrgStructureMermaid(version: OrgStructureVersion): string {
	const orgUnits = version.structure.orgUnits;

	// Build a map for quick lookup
	const unitMap = new Map(orgUnits.map(u => [u._id, u]));

	// Group units by parent for easier traversal
	const childrenMap = new Map<string | null, typeof orgUnits>();
	for (const unit of orgUnits) {
		const parentId = unit.parentId || null;
		if (!childrenMap.has(parentId)) {
			childrenMap.set(parentId, []);
		}
		childrenMap.get(parentId)!.push(unit);
	}

	// Sort children by sortOrder
	for (const children of childrenMap.values()) {
		children.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	// Start building Mermaid diagram
	let mermaid = 'flowchart TD\n';

	// Find root node (BOD or first unit without parent)
	const rootUnits = orgUnits.filter(u => !u.parentId);
	if (rootUnits.length === 0) {
		return 'flowchart TD\n    ERROR[No root unit found]';
	}

	const root = rootUnits[0];

	// Generate node ID (sanitize for Mermaid)
	const getNodeId = (unit: typeof orgUnits[0]) => {
		return unit.code.replace(/[^a-zA-Z0-9]/g, '_');
	};

	// Generate node label based on type
	const getNodeStyle = (unit: typeof orgUnits[0]) => {
		switch (unit.type) {
			case 'board':
				return `${getNodeId(unit)}[${unit.name}]`;
			case 'directorate':
			case 'sbu':
				return `${getNodeId(unit)}[${unit.name}]`;
			case 'division':
				return `${getNodeId(unit)}(${unit.name})`;
			case 'department':
				return `${getNodeId(unit)}([${unit.name}])`;
			case 'section':
				return `${getNodeId(unit)}>${unit.name}]`;
			default:
				return `${getNodeId(unit)}[${unit.name}]`;
		}
	};

	// Track which units have been processed
	const processed = new Set<string>();

	// Special handling for complex structures
	const specialGroups = new Map<string, string[]>();

	// Identify special groupings (e.g., SBU Cargo & Logistics)
	for (const unit of orgUnits) {
		if (unit.code === 'SBUCL') {
			specialGroups.set('SBUCL', ['SCS', 'LOG', 'CBE', 'CLS']);
		}
	}

	// Recursive function to build diagram
	function buildDiagram(unitId: string, indent: string = '    ') {
		if (processed.has(unitId)) return;
		processed.add(unitId);

		const unit = unitMap.get(unitId);
		if (!unit) return;

		const children = childrenMap.get(unitId) || [];

		// Check if this unit has special grouping
		if (specialGroups.has(unit.code)) {
			// Create subgraph for special units
			const groupName = unit.code;
			mermaid += `${indent}subgraph ${groupName}["${unit.name}"]\n`;
			mermaid += `${indent}    direction TB\n`;

			// Add main node
			mermaid += `${indent}    ${getNodeStyle(unit)}\n`;

			// Add children within subgraph
			for (const child of children) {
				mermaid += `${indent}    ${getNodeStyle(child)}\n`;
				processed.add(child._id);
			}

			mermaid += `${indent}end\n`;

			// Process grandchildren outside the subgraph
			for (const child of children) {
				const grandchildren = childrenMap.get(child._id) || [];
				for (const grandchild of grandchildren) {
					// Create connections
					mermaid += `${indent}${getNodeId(child)} --> ${getNodeStyle(grandchild)}\n`;
					buildDiagram(grandchild._id, indent);
				}
			}
		} else {
			// Regular processing
			for (const child of children) {
				mermaid += `${indent}${getNodeId(unit)} --> ${getNodeStyle(child)}\n`;
				buildDiagram(child._id, indent);
			}
		}
	}

	// Start with root
	mermaid += `    ${getNodeStyle(root)}\n`;
	buildDiagram(root._id);

	// Add styling
	mermaid += '\n';
	mermaid += '    classDef board fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n';
	mermaid += '    classDef directorate fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';
	mermaid += '    classDef sbu fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n';
	mermaid += '    classDef division fill:#e8f5e9,stroke:#388e3c,stroke-width:2px\n';
	mermaid += '    classDef department fill:#fce4ec,stroke:#c2185b,stroke-width:1px\n';
	mermaid += '    classDef section fill:#e0f2f1,stroke:#00796b,stroke-width:1px\n';

	// Apply classes to nodes based on type
	for (const unit of orgUnits) {
		const nodeId = getNodeId(unit);
		mermaid += `    class ${nodeId} ${unit.type}\n`;
	}

	return mermaid;
}

/**
 * Generate simplified Mermaid diagram (top 2-3 levels only)
 */
export function generateSimplifiedMermaid(version: OrgStructureVersion, maxLevel: number = 3): string {
	const orgUnits = version.structure.orgUnits.filter(u => u.level <= maxLevel);

	// Build a map for quick lookup
	const unitMap = new Map(orgUnits.map(u => [u._id, u]));

	let mermaid = 'flowchart TD\n';

	// Find root
	const rootUnits = orgUnits.filter(u => !u.parentId);
	if (rootUnits.length === 0) {
		return 'flowchart TD\n    ERROR[No root unit found]';
	}

	const root = rootUnits[0];

	const getNodeId = (unit: typeof orgUnits[0]) => {
		return unit.code.replace(/[^a-zA-Z0-9]/g, '_');
	};

	// Simple node labels
	mermaid += `    ${getNodeId(root)}[${root.name}]\n`;

	// Add all relationships
	for (const unit of orgUnits) {
		if (unit.parentId && unitMap.has(unit.parentId)) {
			const parent = unitMap.get(unit.parentId)!;
			mermaid += `    ${getNodeId(parent)} --> ${getNodeId(unit)}[${unit.name}]\n`;
		}
	}

	// Add basic styling
	mermaid += '\n';
	mermaid += '    classDef board fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n';
	mermaid += '    classDef directorate fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';

	for (const unit of orgUnits) {
		if (unit.type === 'board' || unit.type === 'directorate') {
			mermaid += `    class ${getNodeId(unit)} ${unit.type}\n`;
		}
	}

	return mermaid;
}

/**
 * Generate Mermaid diagram for specific branch of org structure
 */
export function generateBranchMermaid(
	version: OrgStructureVersion,
	rootUnitId: string
): string {
	const allUnits = version.structure.orgUnits;
	const unitMap = new Map(allUnits.map(u => [u._id, u]));

	// Find all descendants of the root unit
	const descendants = new Set<string>();

	function findDescendants(unitId: string) {
		descendants.add(unitId);
		const children = allUnits.filter(u => u.parentId === unitId);
		for (const child of children) {
			findDescendants(child._id);
		}
	}

	findDescendants(rootUnitId);

	const orgUnits = allUnits.filter(u => descendants.has(u._id));

	let mermaid = 'flowchart TD\n';

	const rootUnit = unitMap.get(rootUnitId);
	if (!rootUnit) {
		return 'flowchart TD\n    ERROR[Unit not found]';
	}

	const getNodeId = (unit: typeof orgUnits[0]) => {
		return unit.code.replace(/[^a-zA-Z0-9]/g, '_');
	};

	// Add root
	mermaid += `    ${getNodeId(rootUnit)}[${rootUnit.name}]\n`;

	// Add all relationships
	for (const unit of orgUnits) {
		if (unit.parentId && unitMap.has(unit.parentId) && descendants.has(unit.parentId)) {
			const parent = unitMap.get(unit.parentId)!;
			mermaid += `    ${getNodeId(parent)} --> ${getNodeId(unit)}[${unit.name}]\n`;
		}
	}

	return mermaid;
}
