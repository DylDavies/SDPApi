// Interface for structured address
export interface IAddress {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    placeId?: string; // Google Place ID for reference
    formattedAddress?: string; // Full formatted address from Google
}
