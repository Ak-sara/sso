import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { fail, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	const organization = await db.collection('organizations').findOne({
		_id: new ObjectId(params.id)
	});

	if (!organization) {
		throw redirect(302, '/realms');
	}

	return {
		organization: {
			...organization,
			_id: organization._id.toString()
		}
	};
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const formData = await request.formData();
		const db = getDB();

		const branding = {
			appName: formData.get('appName') as string,
			logoBase64: formData.get('logoBase64') as string || undefined,
			faviconBase64: formData.get('faviconBase64') as string || undefined,
			primaryColor: formData.get('primaryColor') as string,
			secondaryColor: formData.get('secondaryColor') as string,
			accentColor: formData.get('accentColor') as string || undefined,
			backgroundColor: formData.get('backgroundColor') as string || undefined,
			textColor: formData.get('textColor') as string || undefined,
			emailFromName: formData.get('emailFromName') as string || undefined,
			emailFromAddress: formData.get('emailFromAddress') as string || undefined,
			supportEmail: formData.get('supportEmail') as string || undefined,
		};

		await db.collection('organizations').updateOne(
			{ _id: new ObjectId(params.id) },
			{
				$set: {
					branding,
					updatedAt: new Date()
				}
			}
		);

		return { success: 'Branding berhasil diperbarui' };
	}
};
