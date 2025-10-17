import type { Branding } from '$lib/db/schemas';

/**
 * Get CSS custom properties for branding colors
 */
export function getBrandingCSS(branding: Branding): string {
	// Helper function to convert hex to rgb
	const hexToRgb = (hex: string): string => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
			: '79, 70, 229'; // fallback to indigo-600
	};

	const primaryRgb = hexToRgb(branding.primaryColor);
	const secondaryRgb = hexToRgb(branding.secondaryColor);
	const accentRgb = hexToRgb(branding.accentColor || branding.primaryColor);

	return `
		:root {
			--brand-primary: ${branding.primaryColor};
			--brand-primary-rgb: ${primaryRgb};
			--brand-secondary: ${branding.secondaryColor};
			--brand-secondary-rgb: ${secondaryRgb};
			--brand-accent: ${branding.accentColor || branding.primaryColor};
			--brand-accent-rgb: ${accentRgb};
			--brand-bg: ${branding.backgroundColor || '#f9fafb'};
			--brand-text: ${branding.textColor || '#ffffff'};
		}
		.brand-bg-primary { background-color: var(--brand-primary); }
		.brand-bg-primary-hover:hover { background-color: rgba(var(--brand-primary-rgb), 0.9); }
		.brand-bg-primary-active { background-color: rgba(var(--brand-primary-rgb), 0.85); }
		.brand-text-primary { color: var(--brand-primary); }
		.brand-border-primary { border-color: var(--brand-primary); }
	`.trim();
}
