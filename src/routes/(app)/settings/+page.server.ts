import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
    const db = getDB();

    // Get all organizations as realms
    const organizations = await db.collection('organizations').find({}).sort({ name: 1 }).toArray();

    // Get user and employee counts per organization
    const realmsWithCounts = await Promise.all(
        organizations.map(async (org) => {
            return {
                ...org,
                _id: org._id.toString(),
                parentId: org.parentId?.toString() || null
            };
        })
    );

    return {
        realms: realmsWithCounts,
    };
};
