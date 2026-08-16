const db = require('../config/db');

async function reconcileOfficers() {
  console.log('--- Starting Officer Database Reconciliation ---');

  // Fetch all users with role = 'officer'
  const { rows: officers } = await db.query("SELECT id, name, email, status, employee_id, department_id, settings FROM users WHERE role = 'officer'");

  console.log(`Found ${officers.length} officer user records in PostgreSQL.`);

  for (const officer of officers) {
    let needsUpdate = false;
    let employeeId = officer.employee_id;
    let status = officer.status || 'pending';
    let currentSettings = typeof officer.settings === 'string' ? JSON.parse(officer.settings) : (officer.settings || {});

    // Generate Employee ID if missing
    if (!employeeId) {
      const cityCode = 'DEL';
      employeeId = `CGN-${cityCode}-GEN-${String(officer.id).padStart(5, '0')}`;
      needsUpdate = true;
    }

    // Determine correct onboarding status based on existing data
    let onboardingStatus = currentSettings.onboarding_status;
    if (!onboardingStatus) {
      if (officer.department_id && officer.employee_id) {
        onboardingStatus = 'COMPLETED';
        status = 'approved';
      } else {
        onboardingStatus = 'PENDING_DETAILS';
        status = 'pending';
      }
      needsUpdate = true;
    }

    const updatedSettings = {
      ...currentSettings,
      onboarding_status: onboardingStatus,
      employee_id: employeeId
    };

    if (needsUpdate || JSON.stringify(currentSettings) !== JSON.stringify(updatedSettings)) {
      console.log(`Reconciling Officer ID ${officer.id} (${officer.name}): status=${status}, onboardingStatus=${onboardingStatus}, employee_id=${employeeId}`);
      await db.query(`
        UPDATE users SET
          status = $1,
          employee_id = $2,
          settings = $3
        WHERE id = $4
      `, [status, employeeId, JSON.stringify(updatedSettings), officer.id]);
    } else {
      console.log(`Officer ID ${officer.id} (${officer.name}) is already reconciled: ${employeeId}`);
    }
  }

  console.log('--- Officer Database Reconciliation Complete ---');
  process.exit(0);
}

reconcileOfficers().catch(err => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
