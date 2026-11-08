const enumValues = {
  fuelType: ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG'],
  serviceType: ['PERIODIC_MAINTENANCE', 'OIL_CHANGE', 'MAJOR_SERVICE', 'ACCIDENTAL_REPAIR', 'GENERAL_CHECKUP', 'WHEEL_ALIGNMENT', 'BRAKE_SERVICE', 'AC_SERVICE', 'INSURANCE_ASSISTANCE'],
  serviceStatus: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  insuranceType: ['COMPREHENSIVE', 'THIRD_PARTY', 'ZERO_DEP'],
  documentType: ['PUC', 'RC', 'INSURANCE', 'EXTENDED_WARRANTY', 'FASTAG', 'OTHER'],
  reminderCategory: ['SERVICE', 'INSURANCE', 'PUC', 'DOCUMENT', 'CUSTOM'],
  reminderStatus: ['UPCOMING', 'DUE_TODAY', 'OVERDUE', 'COMPLETED', 'CANCELLED'],
  requestStatus: ['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED'],
  channel: ['EMAIL']
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

export function isEnum<K extends keyof typeof enumValues>(name: K, value: unknown): value is (typeof enumValues)[K][number] {
  return typeof value === 'string' && (enumValues[name] as readonly string[]).includes(value);
}

export function isText(value: unknown, max = 250): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

export function isOptionalText(value: unknown, max = 1000): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.length <= max);
}

export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}

export function isOptionalDate(value: unknown): boolean {
  return value === undefined || value === null || value === '' || isDate(value);
}

export function isFiniteNonNegative(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value: unknown): value is string {
  return typeof value === 'string' && /^[+\d][\d\s().-]{5,24}$/.test(value.trim());
}

export function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && value.length <= 200;
}

export function currentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}
