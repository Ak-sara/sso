import '../setup';
import { test, expect } from '@ak-sara/fbao/testing';
import { db } from '../../src/lib/db/db';

test('db.organizations exists', 'Repository instance is available', () => {
	expect(db.organizations).not.toBeUndefined();
});

test('db.identities exists', 'Identity repository is available', () => {
	expect(db.identities).not.toBeUndefined();
});
