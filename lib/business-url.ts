export function slugifyBusinessName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "business";
}

export function getBusinessPath(
  businessName: string,
  businessId: string
): string {
  return `/business/${slugifyBusinessName(businessName)}/${businessId}`;
}
