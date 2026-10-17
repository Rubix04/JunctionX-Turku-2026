// Finnish online banks for the first sign-in (server/src/modules/auth/bank-provider.ts serves the real list).
export const banks = [
  { id: 'op', name: 'OP' },
  { id: 'nordea', name: 'Nordea' },
  { id: 'danske', name: 'Danske Bank' },
  { id: 'spankki', name: 'S-Pankki' },
  { id: 'aktia', name: 'Aktia' },
  { id: 'handelsbanken', name: 'Handelsbanken' },
  { id: 'pop', name: 'POP Pankki' },
  { id: 'saastopankki', name: 'Säästöpankki' },
  { id: 'alandsbanken', name: 'Ålandsbanken' },
  { id: 'omasp', name: 'OmaSP' },
] as const;
