import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { useLogger } from '@ak-sara/fbao/foundation';

import { sanitizePaginationParams } from '$lib/utils/pagination';
import { db } from '$lib/db/db';

const log = useLogger({ module: 'app:_unused:server' });

export const load: PageServerLoad = async ({ locals}) => {
    
    return { params:locals.vars };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        try {
            const result = {ok:true,status:200,error:''}
            if (!result.ok) {
                return fail(result.status ?? 400, { error: result.error });
            }   
            return { success: true };
        } catch (err) {
            log.error('Unexpected error in create action', { error: err });
            return fail(500, { error: 'Unexpected error' });
        }
    },
};
