import type { LegacyUserRole } from '@prisma/client';
import { prisma } from './prismaClient';
import type { CustomerAccount, EmployeeAccount } from './models';

const importKey = 'public-legacy-accounts-v1';

function isoDate(value: Date) {
  return value.toISOString();
}

/**
 * Copy legacy accounts and customers into the current app schema once. Source
 * rows remain untouched. Legacy service/vehicle/document tables are modeled
 * separately and are not copied because their integer IDs and contracts differ.
 */
export async function importLegacyAccounts() {
  if (await prisma.dataImport.findUnique({ where: { key: importKey } })) return { employees: 0, customers: 0, remainingLegacyRows: {} as Record<string, number> };

  let users;
  let customers;
  let remainingLegacyRows: Record<string, number> = {};
  try {
    users = await prisma.legacyUser.findMany();
    customers = await prisma.legacyCustomer.findMany({ include: { user: true } });
    const counts = await Promise.all(([ 
      ['vehicles', prisma.legacyVehicle.count()],
      ['services', prisma.legacyService.count()],
      ['insurance_policies', prisma.legacyInsurancePolicy.count()],
      ['documents', prisma.legacyDocument.count()],
      ['reminders', prisma.legacyReminder.count()],
      ['notifications', prisma.legacyNotification.count()],
      ['service_requests', prisma.legacyServiceRequest.count()],
      ['email_deliveries', prisma.legacyEmailDelivery.count()]
    ] as const).map(async ([name, countPromise]) => [name, await countPromise] as const));
    remainingLegacyRows = Object.fromEntries(counts.filter(([, count]) => count > 0));
  } catch (error) {
    // A fresh installation may not contain the historical public schema.
    if ((error as { code?: string })?.code === 'P2021' || (error as { code?: string })?.code === 'P2022') {
      return { employees: 0, customers: 0, remainingLegacyRows: {} as Record<string, number> };
    }
    throw error;
  }

  const showroom = await prisma.showroom.findFirst({ orderBy: { id: 'asc' } });
  if (!showroom) return { employees: 0, customers: 0, remainingLegacyRows };

  let importedEmployees = 0;
  let importedCustomers = 0;
  await prisma.$transaction(async transaction => {
    if (await transaction.dataImport.findUnique({ where: { key: importKey } })) return;

    for (const user of users) {
      if (user.role === 'CUSTOMER') continue;
      const employee: EmployeeAccount = {
        id: `legacy-employee-${user.id}`,
        showroomId: showroom.id,
        name: user.fullName,
        email: user.email,
        phone: '',
        role: (user.role as LegacyUserRole) === 'MANAGER' ? 'ADMIN' : 'EMPLOYEE',
        employeeCode: `LEGACY-${String(user.id).padStart(6, '0')}`,
        designation: user.role === 'MANAGER' ? 'Legacy Manager' : 'Legacy Employee',
        passwordHash: user.passwordHash,
        active: user.status === 'ACTIVE',
        createdAt: isoDate(user.createdAt),
        updatedAt: isoDate(user.updatedAt)
      };
      await transaction.employee.upsert({
        where: { id: employee.id },
        create: {
          id: employee.id,
          showroomId: employee.showroomId,
          email: employee.email,
          employeeCode: employee.employeeCode,
          payload: employee as any
        },
        update: {}
      });
      importedEmployees++;
    }

    for (const legacy of customers) {
      const customer: CustomerAccount = {
        id: `legacy-customer-${legacy.id}`,
        showroomId: showroom.id,
        customerCode: `LEGACY-CUST-${String(legacy.id).padStart(6, '0')}`,
        name: legacy.name,
        phone: legacy.phone || '',
        email: legacy.email || '',
        address: legacy.address || '',
        city: '',
        pincode: '',
        status: legacy.user?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        preferredChannel: 'EMAIL',
        ...(legacy.user ? { passwordHash: legacy.user.passwordHash } : {}),
        createdAt: isoDate(legacy.registeredOn),
        updatedAt: legacy.user ? isoDate(legacy.user.updatedAt) : isoDate(legacy.registeredOn)
      };
      await transaction.customer.upsert({
        where: { id: customer.id },
        create: {
          id: customer.id,
          showroomId: customer.showroomId,
          email: customer.email || null,
          payload: customer as any
        },
        update: {}
      });
      importedCustomers++;
    }

    await transaction.dataImport.create({ data: { key: importKey } });
  });

  return { employees: importedEmployees, customers: importedCustomers, remainingLegacyRows };
}
