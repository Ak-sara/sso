/**
 * CSV Parser for Employee Reassignment
 *
 * Expected CSV format:
 * NIK,Nama,Unit Kerja Baru,Posisi Baru,Lokasi Kerja,Region,Alasan,Catatan
 * IAS-001,Budi Santoso,IT,Manager,Jakarta,Pusat,Promosi,Promoted to Manager
 * IAS-002,Siti Nurhaliza,ACC,Senior Staff,Jakarta,Pusat,Rotasi,Regular rotation
 */

export interface CSVReassignmentRow {
	employeeId: string; // NIK
	employeeName?: string;
	newOrgUnitCode?: string;
	newPositionCode?: string;
	newWorkLocation?: string;
	newRegion?: string;
	reason?: string;
	notes?: string;
}

export interface CSVParseResult {
	success: boolean;
	data: CSVReassignmentRow[];
	errors: string[];
	warnings: string[];
	rowCount: number;
}

/**
 * Parse CSV file content into reassignment rows
 */
export async function parseReassignmentCSV(fileContent: string): Promise<CSVParseResult> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const data: CSVReassignmentRow[] = [];

	try {
		// Split into lines
		const lines = fileContent.split(/\r?\n/).filter(line => line.trim());

		if (lines.length === 0) {
			return {
				success: false,
				data: [],
				errors: ['File CSV kosong'],
				warnings: [],
				rowCount: 0
			};
		}

		// Parse header
		const header = lines[0].split(',').map(h => h.trim().toLowerCase());

		// Validate required columns
		const requiredColumns = ['nip'];
		const missingColumns = requiredColumns.filter(col => !header.includes(col));

		if (missingColumns.length > 0) {
			errors.push(`Kolom yang wajib tidak ditemukan: ${missingColumns.join(', ')}`);
		}

		// Map column names to indices
		const colMap: Record<string, number> = {};
		header.forEach((col, idx) => {
			if (col === 'nip' || col === 'employee_id' || col === 'employeeid') {
				colMap['employeeId'] = idx;
			} else if (col === 'nama' || col === 'name' || col === 'employee_name') {
				colMap['employeeName'] = idx;
			} else if (col === 'unit kerja baru' || col === 'unit_kerja' || col === 'org_unit' || col === 'unit') {
				colMap['newOrgUnitCode'] = idx;
			} else if (col === 'posisi baru' || col === 'position' || col === 'jabatan' || col === 'posisi') {
				colMap['newPositionCode'] = idx;
			} else if (col === 'lokasi kerja' || col === 'lokasi' || col === 'work_location' || col === 'location') {
				colMap['newWorkLocation'] = idx;
			} else if (col === 'region' || col === 'wilayah') {
				colMap['newRegion'] = idx;
			} else if (col === 'alasan' || col === 'reason') {
				colMap['reason'] = idx;
			} else if (col === 'catatan' || col === 'notes' || col === 'keterangan') {
				colMap['notes'] = idx;
			}
		});

		// Parse data rows
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const rowNumber = i + 1;
			const cells = parseCSVLine(line);

			// Validate minimum required data
			if (colMap['employeeId'] === undefined) {
				errors.push(`Baris ${rowNumber}: Kolom NIK tidak ditemukan`);
				continue;
			}

			const employeeId = cells[colMap['employeeId']]?.trim();
			if (!employeeId) {
				errors.push(`Baris ${rowNumber}: NIK tidak boleh kosong`);
				continue;
			}

			const row: CSVReassignmentRow = {
				employeeId,
				employeeName: cells[colMap['employeeName']]?.trim() || undefined,
				newOrgUnitCode: cells[colMap['newOrgUnitCode']]?.trim() || undefined,
				newPositionCode: cells[colMap['newPositionCode']]?.trim() || undefined,
				newWorkLocation: cells[colMap['newWorkLocation']]?.trim() || undefined,
				newRegion: cells[colMap['newRegion']]?.trim() || undefined,
				reason: cells[colMap['reason']]?.trim() || undefined,
				notes: cells[colMap['notes']]?.trim() || undefined
			};

			// Validate that at least one new assignment field is provided
			if (!row.newOrgUnitCode && !row.newPositionCode) {
				warnings.push(`Baris ${rowNumber}: Tidak ada perubahan penempatan untuk ${employeeId}`);
			}

			data.push(row);
		}

		return {
			success: errors.length === 0,
			data,
			errors,
			warnings,
			rowCount: data.length
		};

	} catch (error) {
		return {
			success: false,
			data: [],
			errors: [`Error parsing CSV: ${error instanceof Error ? error.message : String(error)}`],
			warnings: [],
			rowCount: 0
		};
	}
}

/**
 * Parse a CSV line handling quoted values and commas
 */
function parseCSVLine(line: string): string[] {
	const cells: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			// Handle escaped quotes
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			cells.push(current);
			current = '';
		} else {
			current += char;
		}
	}

	cells.push(current);
	return cells;
}

/**
 * Generate CSV template for download
 */
export function generateReassignmentCSVTemplate(): string {
	const headers = [
		'NIK',
		'Nama',
		'Unit Kerja Baru',
		'Posisi Baru',
		'Lokasi Kerja',
		'Region',
		'Alasan',
		'Catatan'
	];

	const examples = [
		'IAS-001,Budi Santoso,IT,Manager,Jakarta,Pusat,Promosi,Promoted to Manager position',
		'IAS-002,Siti Nurhaliza,ACC,Senior Staff,Jakarta,Pusat,Rotasi,Regular rotation',
		'IAS-003,Ahmad Wijaya,CGSL,Supervisor,CGK,Regional 2,Transfer,Transfer to regional office'
	];

	return [headers.join(','), ...examples].join('\n');
}

/**
 * Validate employee IDs exist in database
 */
export function validateEmployeeIds(rows: CSVReassignmentRow[], existingEmployeeIds: Set<string>): string[] {
	const errors: string[] = [];

	rows.forEach((row, idx) => {
		if (!existingEmployeeIds.has(row.employeeId)) {
			errors.push(`Baris ${idx + 2}: NIK ${row.employeeId} tidak ditemukan di database`);
		}
	});

	return errors;
}

// ========================================
// Generic CSV Parser for All Collections
// ========================================

export interface GenericCSVParseResult {
	success: boolean;
	data: Record<string, any>[];
	errors: string[];
	warnings: string[];
	rowCount: number;
	headers: string[];
}

/**
 * Parse generic CSV file content into objects
 */
export async function parseCSV(fileContent: string): Promise<GenericCSVParseResult> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const data: Record<string, any>[] = [];

	try {
		// Split into lines
		const lines = fileContent.split(/\r?\n/).filter(line => line.trim());

		if (lines.length === 0) {
			return {
				success: false,
				data: [],
				errors: ['CSV file is empty'],
				warnings: [],
				rowCount: 0,
				headers: []
			};
		}

		// Parse header
		const headerCells = parseCSVLine(lines[0]);
		const headers = headerCells.map(h => h.trim());

		if (headers.length === 0) {
			errors.push('No headers found in CSV file');
		}

		// Parse data rows
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const rowNumber = i + 1;
			const cells = parseCSVLine(line);

			// Build row object
			const row: Record<string, any> = {};
			for (let j = 0; j < headers.length; j++) {
				const header = headers[j];
				const value = cells[j]?.trim() || '';

				// Store raw value (will be transformed later)
				row[header] = value;
			}

			data.push(row);
		}

		return {
			success: errors.length === 0,
			data,
			errors,
			warnings,
			rowCount: data.length,
			headers
		};

	} catch (error) {
		return {
			success: false,
			data: [],
			errors: [`Error parsing CSV: ${error instanceof Error ? error.message : String(error)}`],
			warnings: [],
			rowCount: 0,
			headers: []
		};
	}
}

/**
 * Parse CSV file from path
 */
export async function parseCSVFile(filePath: string): Promise<GenericCSVParseResult> {
	try {
		const file = Bun.file(filePath);
		const content = await file.text();
		return await parseCSV(content);
	} catch (error) {
		return {
			success: false,
			data: [],
			errors: [`Error reading CSV file: ${error instanceof Error ? error.message : String(error)}`],
			warnings: [],
			rowCount: 0,
			headers: []
		};
	}
}

/**
 * Column mapping registry for flexible CSV imports
 * Maps various CSV column names to standard database field names
 */
export const COLUMN_MAPPINGS: Record<string, Record<string, string[]>> = {
	identities: {
		email: ['email', 'Email', 'EMAIL', 'user_email'],
		username: ['username', 'Username', 'USERNAME', 'user_name'],
		firstName: ['firstName', 'FirstName', 'first_name', 'Firstname'],
		lastName: ['lastName', 'LastName', 'last_name', 'Lastname'],
		employeeId: ['employeeId', 'NIK', 'nik', 'employee_id', 'nip', 'NIP'],
		organization: ['organization', 'Organization', 'org', 'company', 'orgCode'],
		orgUnit: ['orgUnit', 'OrgUnit', 'org_unit', 'unit', 'department', 'officeLocation'],
		position: ['position', 'Position', 'posisi', 'jabatan', 'title'],
		manager: ['manager', 'Manager', 'manager_email', 'atasan'],
		employmentType: ['employmentType', 'employment_type', 'type', 'contract_type'],
		employmentStatus: ['employmentStatus', 'employment_status', 'status'],
		isActive: ['isActive', 'is_active', 'active', 'status'],
		identityType: ['identityType', 'identity_type', 'type', 'user_type'],
		partnerType: ['partnerType', 'partner_type'],
		companyName: ['companyName', 'company_name', 'company']
	},
	organizations: {
		code: ['code', 'Code', 'CODE', 'org_code'],
		name: ['name', 'Name', 'NAME', 'org_name'],
		parentCode: ['parentCode', 'parent_code', 'parent', 'parent_org'],
		realm: ['realm', 'Realm', 'REALM'],
		isActive: ['isActive', 'is_active', 'active']
	},
	org_units: {
		code: ['code', 'Code', 'CODE', 'unit_code'],
		name: ['name', 'Name', 'NAME', 'unit_name'],
		organization: ['organization', 'Organization', 'org', 'org_code'],
		parentCode: ['parentCode', 'parent_code', 'parent', 'parent_unit'],
		unitType: ['unitType', 'unit_type', 'type'],
		description: ['description', 'Description', 'desc']
	},
	positions: {
		code: ['code', 'Code', 'CODE', 'position_code'],
		name: ['name', 'Name', 'NAME', 'position_name', 'title'],
		level: ['level', 'Level', 'LEVEL', 'position_level'],
		description: ['description', 'Description', 'desc']
	}
};

/**
 * Normalize CSV row using column mappings
 * Converts various column name formats to standard field names
 */
export function normalizeCSVRow(
	row: Record<string, any>,
	collectionName: string
): Record<string, any> {
	const mappings = COLUMN_MAPPINGS[collectionName];
	if (!mappings) {
		return row; // No mappings, return as-is
	}

	const normalized: Record<string, any> = {};

	// Map each CSV column to standard field name
	for (const [csvKey, csvValue] of Object.entries(row)) {
		const csvKeyLower = csvKey.toLowerCase().trim();
		let matched = false;

		// Check if this CSV column matches any standard field
		for (const [standardField, possibleNames] of Object.entries(mappings)) {
			if (possibleNames.some(name => name.toLowerCase() === csvKeyLower)) {
				normalized[standardField] = csvValue;
				matched = true;
				break;
			}
		}

		// If no match, keep original key
		if (!matched) {
			normalized[csvKey] = csvValue;
		}
	}

	return normalized;
}
