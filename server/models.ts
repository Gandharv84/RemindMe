import type { Customer, Employee } from '../src/types';

// Authentication-only fields stay in server models and never enter the
// browser-facing shared domain types.
export type CustomerAccount = Customer & { passwordHash?: string };
export type EmployeeAccount = Employee & { passwordHash: string };
