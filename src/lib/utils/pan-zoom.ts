/**
 * Custom pan-zoom utility for interactive diagrams
 * Provides drag-to-pan, mouse wheel zoom, and programmatic zoom controls
 */

export interface PanZoomOptions {
	/** Element to listen for events (viewport) */
	container: HTMLElement;
	/** Element to transform */
	target: HTMLElement;
	/** Initial scale (default: 1) */
	initialScale?: number;
	/** Minimum zoom scale (default: 0.1) */
	minScale?: number;
	/** Maximum zoom scale (default: 10) */
	maxScale?: number;
	/** CSS selector for elements that should not trigger panning (e.g., '.node') */
	excludeSelector?: string;
	/** Callback when pan starts */
	onPanStart?: () => void;
	/** Callback when pan ends */
	onPanEnd?: () => void;
	/** Callback when transform changes */
	onTransform?: (transform: { x: number; y: number; scale: number }) => void;
}

export interface PanZoomInstance {
	/** Zoom in from center */
	zoomIn: () => void;
	/** Zoom out from center */
	zoomOut: () => void;
	/** Reset to initial position and scale */
	reset: () => void;
	/** Get current transform */
	getTransform: () => { x: number; y: number; scale: number };
	/** Set transform programmatically */
	setTransform: (x: number, y: number, scale: number) => void;
	/** Clean up event listeners */
	destroy: () => void;
}

export function createPanZoom(options: PanZoomOptions): PanZoomInstance {
	const {
		container,
		target,
		initialScale = 1,
		minScale = 0.1,
		maxScale = 10,
		excludeSelector,
		onPanStart,
		onPanEnd,
		onTransform
	} = options;

	// Transform state
	let scale = initialScale;
	let translateX = 0;
	let translateY = 0;

	// Pan state
	let isPanning = false;
	let startX = 0;
	let startY = 0;
	let initialX = 0;
	let initialY = 0;

	// Update transform
	function updateTransform() {
		target.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
		onTransform?.({ x: translateX, y: translateY, scale });
	}

	// Mouse down - start panning
	function handleMouseDown(e: MouseEvent) {
		// Don't pan if clicking on excluded elements
		if (excludeSelector && (e.target as HTMLElement).closest(excludeSelector)) {
			return;
		}

		isPanning = true;
		startX = e.clientX;
		startY = e.clientY;
		initialX = translateX;
		initialY = translateY;
		container.style.cursor = 'grabbing';
		onPanStart?.();
	}

	// Mouse move - pan
	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;

		const dx = e.clientX - startX;
		const dy = e.clientY - startY;

		translateX = initialX + dx;
		translateY = initialY + dy;

		updateTransform();
	}

	// Mouse up - stop panning
	function handleMouseUp() {
		if (isPanning) {
			onPanEnd?.();
		}
		isPanning = false;
		container.style.cursor = 'grab';
	}

	// Mouse wheel - zoom
	function handleWheel(e: WheelEvent) {
		e.preventDefault();

		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));

		// Zoom towards mouse position
		const rect = container.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Adjust translate to zoom towards mouse
		const scaleChange = newScale / scale;
		translateX = mouseX - (mouseX - translateX) * scaleChange;
		translateY = mouseY - (mouseY - translateY) * scaleChange;

		scale = newScale;
		updateTransform();
	}

	// Attach event listeners
	container.addEventListener('mousedown', handleMouseDown);
	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleMouseUp);
	container.addEventListener('wheel', handleWheel, { passive: false });

	// Zoom in from center
	function zoomIn() {
		const rect = container.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const newScale = Math.min(maxScale, scale * 1.3);
		const scaleChange = newScale / scale;
		translateX = centerX - (centerX - translateX) * scaleChange;
		translateY = centerY - (centerY - translateY) * scaleChange;
		scale = newScale;
		updateTransform();
	}

	// Zoom out from center
	function zoomOut() {
		const rect = container.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const newScale = Math.max(minScale, scale * 0.77);
		const scaleChange = newScale / scale;
		translateX = centerX - (centerX - translateX) * scaleChange;
		translateY = centerY - (centerY - translateY) * scaleChange;
		scale = newScale;
		updateTransform();
	}

	// Reset to initial state
	function reset() {
		scale = initialScale;
		translateX = 0;
		translateY = 0;
		updateTransform();
	}

	// Get current transform
	function getTransform() {
		return { x: translateX, y: translateY, scale };
	}

	// Set transform programmatically
	function setTransform(x: number, y: number, s: number) {
		translateX = x;
		translateY = y;
		scale = Math.max(minScale, Math.min(maxScale, s));
		updateTransform();
	}

	// Clean up event listeners
	function destroy() {
		container.removeEventListener('mousedown', handleMouseDown);
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		container.removeEventListener('wheel', handleWheel);
	}

	// Apply initial transform
	updateTransform();

	return {
		zoomIn,
		zoomOut,
		reset,
		getTransform,
		setTransform,
		destroy
	};
}
