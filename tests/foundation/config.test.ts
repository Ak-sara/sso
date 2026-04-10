import '../setup';
import { test, expect } from '@ak-sara/fbao/testing';
import { isConfigured } from '@ak-sara/fbao/foundation';

test('FBA is configured', 'configure() was called at startup', () => {
	expect(isConfigured()).toBe(true);
});
