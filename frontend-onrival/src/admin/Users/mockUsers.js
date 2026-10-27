const withName = (p) => ({ ...p, name: `${p.first_name} ${p.last_name}`.trim() });

export const MOCK_EMPLOYEES = [].map(withName);

export const MOCK_CLIENTS = [].map(withName);