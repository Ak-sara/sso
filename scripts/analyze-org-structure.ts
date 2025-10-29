import { readFileSync } from 'fs';

/**
 * Parse the example_org_structure.md diagram and extract the org structure
 */

const exampleDiagram = `
# From DOCS/example_org_structure.md - IAS Internal Structure

flowchart TD
    subgraph BOD
        direction TB
        DU[Direktur Utama] --> DC[Direktur Komersial]
        DU --> DO[Direktur Operasi]
        DU--> DR[Direktur Resiko]
        DU --> DK[Direktur Keuangan]
        DU--> DH[Direktur Human Capital]
    end
    DU --> DDB
    BOD --> SBUCL
    DC -.-> SBUCL
    ...
`;

console.log('📊 Analyzing Org Structure from Example Diagram\n');
console.log('Expected Hierarchy from DOCS/example_org_structure.md:\n');

console.log('BOD (Board of Directors) [ROOT]');
console.log('├── DU (Direktur Utama)');
console.log('│   ├── DC (Direktur Komersial)');
console.log('│   ├── DO (Direktur Operasi)');
console.log('│   ├── DR (Direktur Resiko)');
console.log('│   ├── DK (Direktur Keuangan)');
console.log('│   ├── DH (Direktur Human Capital)');
console.log('│   └── DDB (Direktorat Dukungan Bisnis)');
console.log('│       ├── IA (Internal Audit)');
console.log('│       ├── CS (Corporate Secretary)');
console.log('│       └── CST (Corporate Strategy)');
console.log('└── SBUCL (SBU Cargo & Logistics) [also has dotted connection from DC]');
console.log('    ├── SCS (Cargo Service)');
console.log('    ├── LOG (Logistics)');
console.log('    ├── CBE (Commercial & Business Excellence)');
console.log('    └── CLS (Cargo & Logistics Supports)');

console.log('\n\nActual Hierarchy from scripts/output/org_units.csv:\n');

// Read CSV
const csv = readFileSync('./scripts/output/org_units.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());
const headers = lines[0].split(',');

const units = lines.slice(1).map(line => {
	const values = line.split(',');
	return {
		code: values[0],
		name: values[1],
		organization: values[2],
		parentCode: values[3] || null,
		unitType: values[4],
		description: values[5]
	};
});

// Filter only IAS units (not test data)
const iasUnits = units.filter(u => u.organization === '68f511f8fc205f99615b5b78');

// Build hierarchy
function printHierarchy(code: string, indent: string = '', printed: Set<string> = new Set()) {
	if (printed.has(code)) return;
	printed.add(code);

	const unit = iasUnits.find(u => u.code === code);
	if (!unit) return;

	console.log(`${indent}${code} (${unit.name}) [parent: ${unit.parentCode || 'ROOT'}]`);

	const children = iasUnits.filter(u => u.parentCode === code);
	children.forEach((child, i) => {
		const isLast = i === children.length - 1;
		const newIndent = indent + (isLast ? '└── ' : '├── ');
		printHierarchy(child.code, newIndent, printed);
	});
}

printHierarchy('BOD');

console.log('\n\n🔍 Issues Found:\n');

const directors = ['DC', 'DO', 'DR', 'DK', 'DH'];
const issues: string[] = [];

for (const dirCode of directors) {
	const dir = iasUnits.find(u => u.code === dirCode);
	if (dir) {
		if (dir.parentCode === 'BOD') {
			issues.push(`❌ ${dirCode} (${dir.name}) has parent=BOD, should be DU`);
		} else if (dir.parentCode === 'DU') {
			console.log(`✅ ${dirCode} (${dir.name}) correctly has parent=DU`);
		}
	}
}

if (issues.length > 0) {
	issues.forEach(issue => console.log(issue));

	console.log('\n📝 Fix Required:\n');
	console.log('The following units should have parentCode="DU" instead of "BOD":');
	directors.forEach(code => {
		const unit = iasUnits.find(u => u.code === code);
		if (unit && unit.parentCode === 'BOD') {
			console.log(`   - ${code}: ${unit.name}`);
		}
	});
} else {
	console.log('✅ All directors correctly parent to DU');
}

console.log('\n\n🎯 Expected CSV Structure:\n');
console.log('code,name,organization,parentCode,unitType,description');
console.log('BOD,Board of Directors,68f511f8fc205f99615b5b78,,board,');
console.log('DU,Direktur Utama,68f511f8fc205f99615b5b78,BOD,directorate,');
console.log('DC,Direktur Komersial,68f511f8fc205f99615b5b78,DU,directorate,');
console.log('DO,Direktur Operasi,68f511f8fc205f99615b5b78,DU,directorate,');
console.log('DR,Direktur Resiko,68f511f8fc205f99615b5b78,DU,directorate,');
console.log('DK,Direktur Keuangan,68f511f8fc205f99615b5b78,DU,directorate,');
console.log('DH,Direktur SDM,68f511f8fc205f99615b5b78,DU,directorate,');
console.log('DDB,Direktorat Dukungan Bisnis,68f511f8fc205f99615b5b78,DU,directorate,');
console.log('SBUCL,SBU Cargo & Logistics,68f511f8fc205f99615b5b78,BOD,sbu,');
console.log('...');
