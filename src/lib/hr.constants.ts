// Shared HR-related constants used across pages/components
// Keep these outside of Next.js page modules to satisfy Next export constraints

const HR = {
  departmentKeys: [
    "Engineering",
    "Human Resources",
    "Finance",
    "Procurement",
    "Operations",
  ] as const,

  roleKeys: [
    "Project Manager",
    "HR Specialist",
    "Accountant",
    "Civil Engineer",
    "Procurement Officer",
    "Worker",
  ] as const,
};

export default HR;

export type DepartmentKey = typeof HR.departmentKeys[number];
export type RoleKey = typeof HR.roleKeys[number];
