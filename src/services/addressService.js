import addressMapping from '../data/addressMapping.json';

export const lookupOldAddress = (provinceMoi, wardMoi) => {
  if (!provinceMoi || !wardMoi) return null;
  const key = `${String(provinceMoi).toLowerCase().trim()}|${String(wardMoi).toLowerCase().trim()}`;
  return addressMapping[key] || null;
};
