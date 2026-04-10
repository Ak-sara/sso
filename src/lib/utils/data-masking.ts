export {
	type MaskType,
	type MaskingRule,
	type MaskingConfig,
	maskField,
	isExemptFromMasking,
	getMaskedRecord as getMaskedIdentity,
	getMaskedRecords as getMaskedIdentities,
	getDefaultMaskingConfig
} from '@ak-sara/fbao/foundation/privacy';
