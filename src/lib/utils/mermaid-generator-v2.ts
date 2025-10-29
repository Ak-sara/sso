import type { OrgStructureVersion } from '$lib/db/schemas';

/**
 * Enhanced Mermaid flowchart generator (V2)
 * Implements Level 2 (Grouped) features from MERMAID_GENERATOR_STRATEGY.md
 *
 * Features:
 * - BOD subgraph with internal hierarchy
 * - Logical grouping subgraphs for directorates
 * - Enhanced SBU subgraphs
 * - Node shapes by type
 * - Color-coded styling by level
 */

interface Unit {
	_id: string;
	code: string;
	name: string;
	parentId: string | null;
	type: string;
	level: number;
	sortOrder: number;
}

export function generateEnhancedMermaid(version: OrgStructureVersion): string {
	const orgUnits = version.structure.orgUnits as Unit[];

	// Build lookup maps
	const unitMap = new Map(orgUnits.map((u) => [u._id, u]));
	const childrenMap = new Map<string | null, Unit[]>();

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

	// Find special units
	const bod = orgUnits.find((u) => u.code === 'BOD');
	const du = orgUnits.find((u) => u.code === 'DU');
	const directors = orgUnits.filter(
		(u) => u.parentId === du?._id && u.type === 'directorate'
	);
	const sbus = orgUnits.filter((u) => u.type === 'sbu');

	const processed = new Set<string>();

	// Helper: Generate node ID
	const getNodeId = (unit: Unit) => unit.code.replace(/[^a-zA-Z0-9]/g, '_');

	// Helper: Escape name for Mermaid
	const escapeName = (name: string) => name.replace(/"/g, '#quot;');

	// Helper: Get node shape based on type
	const getNodeShape = (unit: Unit) => {
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
				return `${getNodeId(unit)}[["${safeName}"]]`;
			default:
				return `${getNodeId(unit)}["${safeName}"]`;
		}
	};

	// 1. Generate BOD Subgraph
	if (bod && du) {
		mermaid += `    subgraph BOD["${escapeName(bod.name)}"]\n`;
		mermaid += `        direction TB\n`;

		// DU node
		mermaid += `        ${getNodeShape(du)}\n`;
		processed.add(du._id);
		processed.add(bod._id); // Mark BOD as processed too

		// Directors under DU
		for (const dir of directors) {
			mermaid += `        ${getNodeShape(dir)}\n`;
			processed.add(dir._id);
		}

		// DDB (if exists)
		const ddb = orgUnits.find((u) => u.code === 'DDB' && u.parentId === du._id);
		if (ddb) {
			mermaid += `        ${getNodeShape(ddb)}\n`;
			processed.add(ddb._id);
		}

		// Connections inside BOD subgraph
		for (const dir of directors) {
			mermaid += `        ${getNodeId(du)} --> ${getNodeId(dir)}\n`;
		}
		if (ddb) {
			mermaid += `        ${getNodeId(du)} --> ${getNodeId(ddb)}\n`;
		}

		mermaid += `    end\n\n`;
	} else if (bod) {
		// Just BOD, no special handling
		mermaid += `    ${getNodeShape(bod)}\n`;
		processed.add(bod._id);
	}

	// 2. Generate DIR container with directorate groups
	if (directors.length > 0) {
		mermaid += `    subgraph DIR[ ]\n`;

		for (const dir of directors) {
			const dirChildren = childrenMap.get(dir._id) || [];
			if (dirChildren.length === 0) continue;

			// Create logical subgraph for this directorate
			const subgraphId = `DD${dir.code}`;
			mermaid += `        subgraph ${subgraphId}[ ]\n`;
			mermaid += `            direction LR\n`;

			// Add divisions
			for (const child of dirChildren) {
				mermaid += `            ${getNodeShape(child)}\n`;
				processed.add(child._id);
			}

			mermaid += `        end\n`;
		}

		mermaid += `    end\n\n`;

		// Connect directors to their divisions
		for (const dir of directors) {
			const dirChildren = childrenMap.get(dir._id) || [];
			for (const child of dirChildren) {
				mermaid += `    ${getNodeId(dir)} --> ${getNodeId(child)}\n`;
			}
		}

		mermaid += '\n';
	}

	// 3. Generate SBU Subgraphs
	for (const sbu of sbus) {
		const sbuChildren = childrenMap.get(sbu._id) || [];

		// Connection from BOD to SBU (outside the subgraphs)
		if (bod) {
			mermaid += `    BOD --> ${getNodeId(sbu)}\n`;
		}

		mermaid += `    subgraph ${getNodeId(sbu)}["${escapeName(sbu.name)}"]\n`;
		mermaid += `        direction TB\n`;

		processed.add(sbu._id);

		// Add direct children (divisions)
		for (const child of sbuChildren) {
			mermaid += `        ${getNodeShape(child)}\n`;
			processed.add(child._id);
		}

		mermaid += `    end\n\n`;

		// Process grandchildren (departments under divisions)
		for (const child of sbuChildren) {
			const grandchildren = childrenMap.get(child._id) || [];
			for (const grandchild of grandchildren) {
				if (!processed.has(grandchild._id)) {
					mermaid += `    ${getNodeId(child)} --> ${getNodeShape(grandchild)}\n`;
					processed.add(grandchild._id);

					// Process great-grandchildren (sections under departments)
					const greatGrandchildren = childrenMap.get(grandchild._id) || [];
					for (const ggChild of greatGrandchildren) {
						if (!processed.has(ggChild._id)) {
							mermaid += `    ${getNodeId(grandchild)} --> ${getNodeShape(ggChild)}\n`;
							processed.add(ggChild._id);
						}
					}
				}
			}
		}

		mermaid += '\n';
	}

	// 4. Process remaining units (not in special groups)
	function processRemaining(unitId: string, indent: string = '    ') {
		if (processed.has(unitId)) return;
		processed.add(unitId);

		const unit = unitMap.get(unitId);
		if (!unit) return;

		const children = childrenMap.get(unitId) || [];
		for (const child of children) {
			if (!processed.has(child._id)) {
				mermaid += `${indent}${getNodeId(unit)} --> ${getNodeShape(child)}\n`;
				processRemaining(child._id, indent);
			}
		}
	}

	// Process from root
	const rootUnits = orgUnits.filter((u) => !u.parentId);
	for (const root of rootUnits) {
		processRemaining(root._id);
	}

	// 5. Styling
	mermaid += '\n';
	mermaid += '    classDef board fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n';
	mermaid += '    classDef directorate fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';
	mermaid += '    classDef sbu fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n';
	mermaid += '    classDef division fill:#e8f5e9,stroke:#388e3c,stroke-width:2px\n';
	mermaid += '    classDef department fill:#fce4ec,stroke:#c2185b,stroke-width:1px\n';
	mermaid += '    classDef section fill:#e0f2f1,stroke:#00796b,stroke-width:1px\n';
	mermaid += '    classDef nostroke stroke:transparent\n';
	mermaid += '    classDef nofill fill:transparent\n';

	// Apply classes
	for (const unit of orgUnits) {
		if (processed.has(unit._id)) {
			mermaid += `    class ${getNodeId(unit)} ${unit.type}\n`;
		}
	}

	// Make logical groups transparent
	if (directors.length > 0) {
		mermaid += '    class DIR nofill,nostroke\n';
		for (const dir of directors) {
			mermaid += `    class DD${dir.code} nofill,nostroke\n`;
		}
	}

	return mermaid;
}
