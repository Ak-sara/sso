/**
 * CSV Parser for Employee Reassignment
 *
 * Expected CSV format:
 * NIP,Nama,Unit Kerja Baru,Posisi Baru,Lokasi Kerja,Region,Alasan,Catatan
 * IAS-001,Budi Santoso,IT,Manager,Jakarta,Pusat,Promosi,Promoted to Manager
 * IAS-002,Siti Nurhaliza,ACC,Senior Staff,Jakarta,Pusat,Rotasi,Regular rotation
 */

export interface CSVReassignmentRow {
	employeeId: string; // NIP
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
				errors.push(`Baris ${rowNumber}: Kolom NIP tidak ditemukan`);
				continue;
			}

			const employeeId = cells[colMap['employeeId']]?.trim();
			if (!employeeId) {
				errors.push(`Baris ${rowNumber}: NIP tidak boleh kosong`);
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
		'NIP',
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
			errors.push(`Baris ${idx + 2}: NIP ${row.employeeId} tidak ditemukan di database`);
		}
	});

	return errors;
}
