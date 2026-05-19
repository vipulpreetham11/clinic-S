export const PRESCRIPTION_FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS'] as const;
export type PrescriptionFrequency = (typeof PRESCRIPTION_FREQUENCIES)[number];

export const isValidFrequency = (freq: string): freq is PrescriptionFrequency => {
  return PRESCRIPTION_FREQUENCIES.includes(freq as PrescriptionFrequency);
};
