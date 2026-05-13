export function getHrmsBasePath() {
  return "/workspace/hrms";
}

export function getHrmsPath(path = "") {
  return `${getHrmsBasePath()}${path}`;
}

export function getHrmsEmployeesPath() {
  return getHrmsPath("/employees");
}

export function getHrmsEmployeePath(userId: string) {
  return getHrmsPath(`/employees/${userId}`);
}

export function getHrmsEmployeeEditPath(userId: string) {
  return getHrmsPath(`/employees/${userId}/edit`);
}

export function getHrmsEmployeeAssignPath(userId: string) {
  return getHrmsPath(`/employees/${userId}/assign`);
}

export function getHrmsPoliciesPath() {
  return getHrmsPath("/policies");
}

export function getHrmsPolicyPath(policyId: string) {
  return getHrmsPath(`/policies/${policyId}`);
}

export function getHrmsPolicyEditPath(policyId: string) {
  return getHrmsPath(`/policies/${policyId}/edit`);
}
