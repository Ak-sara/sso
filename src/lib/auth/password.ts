import { PasswordService } from '@ak-sara/fbao/foundation';

export type { PasswordValidation } from '@ak-sara/fbao/foundation';

export const passwordService = new PasswordService({ minLength: 8 });
