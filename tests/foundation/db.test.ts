import '../setup';
import { test, expect } from '@ak-sara/fbao/testing';
import { getDB } from '../../src/lib/db/connection';

test('getDB returns Db instance', 'useMongo() returns MongoDB Db through getDB()', () => {
	const db = getDB();
	expect(typeof db).toBe('object');
	expect(db.databaseName).not.toBeUndefined();
});

test('getDB is singleton', 'Multiple calls return same instance', () => {
	const db1 = getDB();
	const db2 = getDB();
	expect(db1.databaseName).toBe(db2.databaseName);
});
