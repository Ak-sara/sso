import type { OrgStructureVersion } from '$lib/db/schemas';

/**
 * Generate Mermaid flowchart diagram from organizational structure
 * Uses mermaidConfig if available for logical grouping and styling
 * Otherwise falls back to simple hierarchy rendering
 *
 * @param version The organization structure version
 * @returns Mermaid diagram as string
 */
export function generateOrgStructureMermaid(version: OrgStructureVersion): string {
	const orgUnits = version.structure.orgUnits;
	const config = version.mermaidConfig;

	// If config exists, use config-based rendering
	if (config && config.logicalGroups.length > 0) {
		return generateWithConfig(orgUnits, config);
	}

	// Fallback to simple hierarchy
	return generateSimpleHierarchy(orgUnits);
}

/**
 * Generate Mermaid diagram with mermaidConfig (logical groups, special connections, styling)
 */
function generateWithConfig(
	orgUnits: OrgStructureVersion['structure']['orgUnits'],
	config: NonNullable<OrgStructureVersion['mermaidConfig']>
): string {
	let mermaid = 'flowchart TD\n';

	// Build lookup maps
	const unitMap = new Map(orgUnits.map(u => [u.code, u]));
	const processedUnits = new Set<string>();

	// Helper functions
	const getNodeId = (code: string) => code.replace(/[^a-zA-Z0-9]/g, '_');
	const escapeName = (name: string) => name.replace(/"/g, '#quot;');

	const getNodeShape = (unit: typeof orgUnits[0]): string => {
		const safeName = escapeName(unit.name);
		const customShape = config.nodeStyles[unit.code]?.shape;

		if (customShape) {
			switch (customShape) {
				case 'rounded': return `${getNodeId(unit.code)}("${safeName}")`;
				case 'stadium': return `${getNodeId(unit.code)}(["${safeName}"])`;
				case 'subprocess': return `${getNodeId(unit.code)}[["${safeName}"]]`;
				default: return `${getNodeId(unit.code)}["${safeName}"]`;
			}
		}

		// Default shapes by type
		switch (unit.type) {
			case 'board':
			case 'directorate':
			case 'sbu':
				return `${getNodeId(unit.code)}["${safeName}"]`;
			case 'division':
				return `${getNodeId(unit.code)}("${safeName}")`;
			case 'department':
				return `${getNodeId(unit.code)}(["${safeName}"])`;
			case 'section':
				return `${getNodeId(unit.code)}[["${safeName}"]]`;
			default:
				return `${getNodeId(unit.code)}["${safeName}"]`;
		}
	};

	// 1. Render logical groups as nested subgraphs
	// Build group hierarchy
	const groupMap = new Map(config.logicalGroups.map(g => [g.id, g]));
	const processedGroups = new Set<string>();

	// Recursive function to render a group and its nested children
	const renderGroup = (group: typeof config.logicalGroups[0], depth: number = 0): string => {
		if (processedGroups.has(group.id)) return '';
		processedGroups.add(group.id);

		const indent = '    '.repeat(depth + 1);
		const label = group.label && group.label.trim() !== '' ? ` ["${escapeName(group.label)}"]` : '';
		let groupMermaid = `${indent}subgraph ${group.id}${label}\n`;

		if (group.direction) {
			groupMermaid += `${indent}    direction ${group.direction}\n`;
		}

		// Render items in contains (could be child groups OR units)
		for (const itemCode of group.contains) {
			// First, check if it's a child group
			const childGroup = groupMap.get(itemCode);
			if (childGroup) {
				// It's a group - render it recursively (nested subgraph)
				groupMermaid += renderGroup(childGroup, depth + 1);
			} else {
				// It's not a group - check if it's a unit
				const unit = unitMap.get(itemCode);
				if (unit) {
					groupMermaid += `${indent}    ${getNodeShape(unit)}\n`;
					processedUnits.add(itemCode);
				}
			}
		}

		groupMermaid += `${indent}end\n\n`;
		return groupMermaid;
	};

	// Render top-level groups (those without a parent)
	for (const group of config.logicalGroups) {
		if (!group.parent) {
			mermaid += renderGroup(group);
		}
	}

	// 2. Build children map for all parent-child relationships
	const childrenMap = new Map<string | null, typeof orgUnits>();
	for (const unit of orgUnits) {
		const parentId = unit.parentId || null;
		if (!childrenMap.has(parentId)) {
			childrenMap.set(parentId, []);
		}
		childrenMap.get(parentId)!.push(unit);
	}

	// 3. Render units not in any logical group
	// Skip units whose code matches a logical group ID (they're just containers)
	const logicalGroupIds = new Set(config.logicalGroups.map(g => g.id));

	for (const unit of orgUnits) {
		if (!processedUnits.has(unit.code) && !logicalGroupIds.has(unit.code)) {
			mermaid += `    ${getNodeShape(unit)}\n`;
		}
	}

	mermaid += '\n';

	// 4. Build set of connections that have special overrides
	const specialConnectionPairs = new Set<string>();
	for (const conn of config.specialConnections) {
		if (conn.type === 'hierarchy') {
			// For hierarchy type, we're overriding the parent-child relationship
			specialConnectionPairs.add(`${conn.from}-->${conn.to}`);
		}
	}

	// Also track which units are inside logical groups
	const unitsInLogicalGroups = new Set<string>();
	for (const group of config.logicalGroups) {
		for (const code of group.contains) {
			unitsInLogicalGroups.add(code);
		}
	}

	// 5. Render hierarchy connections, but skip:
	// - Connections involving units that match logical group IDs
	// - Connections that have special connection overrides
	// - Connections between units in the same logical group
	for (const unit of orgUnits) {
		// Skip if this unit's code matches a logical group ID
		if (logicalGroupIds.has(unit.code)) {
			continue;
		}

		const children = childrenMap.get(unit._id) || [];
		for (const child of children) {
			// Skip if child's code matches a logical group ID
			if (logicalGroupIds.has(child.code)) {
				continue;
			}

			const connectionKey = `${unit.code}-->${child.code}`;

			// Skip if there's a special connection override
			if (specialConnectionPairs.has(connectionKey)) {
				continue;
			}

			mermaid += `    ${getNodeId(unit.code)} --> ${getNodeId(child.code)}\n`;
		}
	}

	mermaid += '\n';

	// 6. Render logical group parent connections (unit → group arrows)
	// When a group has a parent that is a unit code (not a group ID), create arrow
	for (const group of config.logicalGroups) {
		if (group.parent) {
			// Check if parent is a unit code (not a group ID)
			const parentUnit = unitMap.get(group.parent);
			if (parentUnit) {
				// It's a unit → group connection
				mermaid += `    ${getNodeId(group.parent)} --> ${group.id}\n`;
			}
			// If parent is a group ID, nesting is already handled in renderGroup()
		}
	}

	mermaid += '\n';

	// 7. Render special connections
	for (const conn of config.specialConnections) {
		const arrow = conn.type === 'matrix' ? '-.-> ' :
		              conn.type === 'alignment' ? '~~~ ' :
		              '--> ';
		mermaid += `    ${getNodeId(conn.from)} ${arrow}${getNodeId(conn.to)}\n`;
	}

	// 8. Add CSS class styling
	mermaid += '\n';
	mermaid += '    classDef board fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n';
	mermaid += '    classDef directorate fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';
	mermaid += '    classDef sbu fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n';
	mermaid += '    classDef division fill:#e8f5e9,stroke:#388e3c,stroke-width:2px\n';
	mermaid += '    classDef department fill:#fce4ec,stroke:#c2185b,stroke-width:1px\n';
	mermaid += '    classDef section fill:#e0f2f1,stroke:#00796b,stroke-width:1px\n';

	// IAS custom color classes
	mermaid += '    classDef s-teal fill:#339999\n';
	mermaid += '    classDef s-blue fill:#00a1f1\n';
	mermaid += '    classDef s-green fill:#34A853\n';
	mermaid += '    classDef s-yellow fill:#FBBC05,color:#000\n';
	mermaid += '    classDef s-red fill:#F14F21,color:#000\n';

	// Transparent styling for logical groups
	mermaid += '    classDef nofill fill:transparent\n';
	mermaid += '    classDef nostroke stroke:transparent\n';

	// Apply type-based classes
	for (const unit of orgUnits) {
		mermaid += `    class ${getNodeId(unit.code)} ${unit.type}\n`;
	}

	// Apply custom style classes
	for (const [code, style] of Object.entries(config.nodeStyles)) {
		if (style.cssClass) {
			mermaid += `    class ${getNodeId(code)} ${style.cssClass}\n`;
		}
	}

	// Apply transparent styling to logical groups
	for (const group of config.logicalGroups) {
		if (group.styling?.transparent) {
			mermaid += `    class ${group.id} nofill,nostroke\n`;
		}
	}

	return mermaid;
}

/**
 * Generate simple hierarchy diagram (no config, fallback mode)
 */
function generateSimpleHierarchy(orgUnits: OrgStructureVersion['structure']['orgUnits']): string {
	const unitMap = new Map(orgUnits.map(u => [u._id, u]));
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

	let mermaid = 'flowchart TD\n';

	const getNodeId = (unit: typeof orgUnits[0]) => unit.code.replace(/[^a-zA-Z0-9]/g, '_');
	const escapeName = (name: string) => name.replace(/"/g, '#quot;');

	const getNodeStyle = (unit: typeof orgUnits[0]) => {
		const safeName = escapeName(unit.name);

		switch (unit.type) {
			case 'board':
			case 'directorate':
			case 'sbu':
				return `${getNodeId(unit)}["${safeName}"]`;
			case 'division':
				return `${getNodeId(unit)}("${safeName}")`;
			case 'department':
				return `${getNodeId(unit)}(["${safeName}"])`;
			case 'section':
				return `${getNodeId(unit)}[/"${safeName}"/]`;
			default:
				return `${getNodeId(unit)}["${safeName}"]`;
		}
	};

	const processed = new Set<string>();
	const sbuUnits = orgUnits.filter(u => u.type === 'sbu' && u.code.startsWith('SBU'));

	// Render SBUs as subgraphs
	for (const sbu of sbuUnits) {
		const children = childrenMap.get(sbu._id) || [];

		mermaid += `    subgraph ${getNodeId(sbu)}["${escapeName(sbu.name)}"]\n`;
		mermaid += `        direction TB\n`;

		for (const child of children) {
			mermaid += `        ${getNodeStyle(child)}\n`;
			processed.add(child._id);
		}

		mermaid += `    end\n\n`;
		processed.add(sbu._id);

		// Process grandchildren
		for (const child of children) {
			const grandchildren = childrenMap.get(child._id) || [];
			for (const grandchild of grandchildren) {
				mermaid += `    ${getNodeId(child)} --> ${getNodeStyle(grandchild)}\n`;
				processed.add(grandchild._id);
			}
		}
	}

	// Render remaining units
	function renderUnit(unitId: string) {
		if (processed.has(unitId)) return;
		processed.add(unitId);

		const unit = unitMap.get(unitId);
		if (!unit) return;

		const children = childrenMap.get(unitId) || [];

		// Render connections to unprocessed children
		for (const child of children) {
			if (sbuUnits.find(s => s._id === child._id)) {
				// Connection to SBU subgraph
				mermaid += `    ${getNodeId(unit)} --> ${getNodeId(child)}\n`;
			} else if (!processed.has(child._id)) {
				mermaid += `    ${getNodeId(unit)} --> ${getNodeStyle(child)}\n`;
				renderUnit(child._id);
			}
		}
	}

	// Start from root units
	const rootUnits = orgUnits.filter(u => !u.parentId);
	for (const root of rootUnits) {
		if (!processed.has(root._id)) {
			mermaid += `    ${getNodeStyle(root)}\n`;
			renderUnit(root._id);
		}
	}

	// Add styling
	mermaid += '\n';
	mermaid += '    classDef board fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n';
	mermaid += '    classDef directorate fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';
	mermaid += '    classDef sbu fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n';
	mermaid += '    classDef division fill:#e8f5e9,stroke:#388e3c,stroke-width:2px\n';
	mermaid += '    classDef department fill:#fce4ec,stroke:#c2185b,stroke-width:1px\n';
	mermaid += '    classDef section fill:#e0f2f1,stroke:#00796b,stroke-width:1px\n';

	for (const unit of orgUnits) {
		mermaid += `    class ${getNodeId(unit)} ${unit.type}\n`;
	}

	return mermaid;
}

/**
 * Generate simplified Mermaid diagram (top 2-3 levels only)
 */
export function generateSimplifiedMermaid(version: OrgStructureVersion, maxLevel: number = 3): string {
	const orgUnits = version.structure.orgUnits.filter(u => u.level <= maxLevel);
	const unitMap = new Map(orgUnits.map(u => [u._id, u]));

	let mermaid = 'flowchart TD\n';

	const rootUnits = orgUnits.filter(u => !u.parentId);
	if (rootUnits.length === 0) {
		return 'flowchart TD\n    ERROR[No root unit found]';
	}

	const root = rootUnits[0];

	const getNodeId = (unit: typeof orgUnits[0]) => unit.code.replace(/[^a-zA-Z0-9]/g, '_');
	const escapeName = (name: string) => name.replace(/"/g, '#quot;');

	// Define all nodes first
	mermaid += `    ${getNodeId(root)}["${escapeName(root.name)}"]\n`;
	for (const unit of orgUnits) {
		if (unit._id !== root._id) {
			mermaid += `    ${getNodeId(unit)}["${escapeName(unit.name)}"]\n`;
		}
	}

	// Add all relationships
	for (const unit of orgUnits) {
		if (unit.parentId && unitMap.has(unit.parentId)) {
			const parent = unitMap.get(unit.parentId)!;
			mermaid += `    ${getNodeId(parent)} --> ${getNodeId(unit)}\n`;
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

	// Find all descendants
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

	const getNodeId = (unit: typeof orgUnits[0]) => unit.code.replace(/[^a-zA-Z0-9]/g, '_');
	const escapeName = (name: string) => name.replace(/"/g, '#quot;');

	// Define all nodes
	mermaid += `    ${getNodeId(rootUnit)}["${escapeName(rootUnit.name)}"]\n`;
	for (const unit of orgUnits) {
		if (unit._id !== rootUnitId) {
			mermaid += `    ${getNodeId(unit)}["${escapeName(unit.name)}"]\n`;
		}
	}

	// Add relationships
	for (const unit of orgUnits) {
		if (unit.parentId && unitMap.has(unit.parentId) && descendants.has(unit.parentId)) {
			const parent = unitMap.get(unit.parentId)!;
			mermaid += `    ${getNodeId(parent)} --> ${getNodeId(unit)}\n`;
		}
	}

	return mermaid;
}
