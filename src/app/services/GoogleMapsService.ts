/**
 * @file GoogleMapsService handles address validation using Google Maps Geocoding API
 */

import { IService } from '../models/interfaces/IService.interface';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';
import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from './LoggingService';
import { IAddress } from '../models/interfaces/IAddress.interface';

interface GeocodeAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

interface GeocodeResult {
    address_components: GeocodeAddressComponent[];
    formatted_address: string;
    place_id: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
}

interface GeocodeResponse {
    results: GeocodeResult[];
    status: string;
}

interface AutocompletePrediction {
    description: string;
    place_id: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

interface AutocompleteResponse {
    predictions: AutocompletePrediction[];
    status: string;
}

export interface AddressSuggestion {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

export class GoogleMapsService implements IService {
    public loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    public serviceName: string = 'GoogleMapsService';

    private logger = Singleton.getInstance(LoggingService);
    private apiKey: string;
    private baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            this.logger.error('Google Maps API key is not configured. Address validation will not work.');
        }
    }

    public async init(): Promise<void> {
        this.logger.info('GoogleMapsService initialized');
    }

    /**
     * Gets address autocomplete suggestions from Google Places API
     * @param input - The user's search input
     * @returns Array of address suggestions
     */
    public async getAutocompleteSuggestions(input: string): Promise<AddressSuggestion[]> {
        if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            throw new Error('Google Maps API key is not configured');
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&key=${this.apiKey}`;
            const response = await fetch(url);
            const data: AutocompleteResponse = await response.json();

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                this.logger.error(`Places Autocomplete API error: ${data.status}`);
                throw new Error(`Failed to get autocomplete suggestions: ${data.status}`);
            }

            if (data.status === 'ZERO_RESULTS' || !data.predictions) {
                return [];
            }

            return data.predictions.map(prediction => ({
                placeId: prediction.place_id,
                description: prediction.description,
                mainText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text
            }));
        } catch (error) {
            this.logger.error('Error getting autocomplete suggestions:', error);
            throw error;
        }
    }

    /**
     * Validates and structures an address using Google Place ID
     * @param placeId - The Google Place ID from autocomplete
     * @returns Structured address object
     */
    public async validateAddressFromPlaceId(placeId: string): Promise<IAddress> {
        if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            throw new Error('Google Maps API key is not configured');
        }

        try {
            const url = `${this.baseUrl}?place_id=${encodeURIComponent(placeId)}&key=${this.apiKey}`;
            const response = await fetch(url);
            const data: GeocodeResponse = await response.json();

            if (data.status !== 'OK' || !data.results || data.results.length === 0) {
                this.logger.error(`Geocoding API error: ${data.status}`);
                throw new Error(`Failed to validate address: ${data.status}`);
            }

            const result = data.results[0];
            return this.parseGeocodeResult(result);
        } catch (error) {
            this.logger.error('Error validating address from Place ID:', error);
            throw error;
        }
    }

    /**
     * Constructs an address string from address components
     * @param address - The address object
     * @returns Formatted address string
     */
    private constructAddressString(address: IAddress): string {
        const parts = [
            address.streetAddress,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ].filter(part => part && part.trim().length > 0);

        return parts.join(', ');
    }

    /**
     * Parses the geocoding result into a structured address
     * @param result - The geocode result from Google Maps API
     * @returns Structured address object
     */
    private parseGeocodeResult(result: GeocodeResult): IAddress {
        const address: IAddress = {
            placeId: result.place_id,
            formattedAddress: result.formatted_address
        };

        // Parse address components
        for (const component of result.address_components) {
            if (component.types.includes('street_number')) {
                address.streetAddress = component.long_name;
            } else if (component.types.includes('route')) {
                address.streetAddress = address.streetAddress
                    ? `${address.streetAddress} ${component.long_name}`
                    : component.long_name;
            } else if (component.types.includes('locality')) {
                address.city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1')) {
                address.state = component.long_name;
            } else if (component.types.includes('postal_code')) {
                address.postalCode = component.long_name;
            } else if (component.types.includes('country')) {
                address.country = component.long_name;
            }
        }

        return address;
    }

    /**
     * Validates an address string and returns structured address
     * @param addressString - The address string to validate
     * @returns Structured address object
     */
    public async validateAddressFromString(addressString: string): Promise<IAddress> {
        if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            throw new Error('Google Maps API key is not configured');
        }

        try {
            const url = `${this.baseUrl}?address=${encodeURIComponent(addressString)}&key=${this.apiKey}`;
            const response = await fetch(url);
            const data: GeocodeResponse = await response.json();

            if (data.status !== 'OK' || !data.results || data.results.length === 0) {
                this.logger.error(`Geocoding API error: ${data.status}`);
                throw new Error(`Failed to validate address: ${data.status}`);
            }

            const result = data.results[0];
            return this.parseGeocodeResult(result);
        } catch (error) {
            this.logger.error('Error validating address from string:', error);
            throw error;
        }
    }

    /**
     * Calculates the distance between two addresses using Google Distance Matrix API
     * @param origin - The origin address
     * @param destination - The destination address
     * @returns Distance in kilometers, or null if calculation fails
     */
    public async calculateDistance(origin: IAddress, destination: IAddress): Promise<number | null> {
        if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            this.logger.warn('Google Maps API key is not configured - distance calculation unavailable');
            return null;
        }

        try {
            // Use formatted addresses or construct from components
            const originString = origin.formattedAddress ||
                this.constructAddressString(origin);
            const destString = destination.formattedAddress ||
                this.constructAddressString(destination);

            if (!originString || originString.trim() === ',,' || !destString || destString.trim() === ',,') {
                this.logger.warn('Insufficient address information for distance calculation', {
                    origin: originString,
                    destination: destString
                });
                return null;
            }

            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originString)}&destinations=${encodeURIComponent(destString)}&units=metric&key=${this.apiKey}`;
            const response = await fetch(url);
            const data: any = await response.json();

            if (data.status !== 'OK' || !data.rows || data.rows.length === 0) {
                this.logger.warn(`Distance Matrix API error: ${data.status}. Origin: "${originString}", Dest: "${destString}"`);
                return null;
            }

            const element = data.rows[0].elements[0];
            if (element.status !== 'OK') {
                this.logger.warn(`Distance calculation element status: ${element.status}. Origin: "${originString}", Dest: "${destString}"`);
                return null;
            }

            // Return distance in kilometers
            const distanceKm = element.distance.value / 1000; // Convert meters to kilometers
            this.logger.debug(`Distance calculated: ${distanceKm.toFixed(2)} km from "${originString}" to "${destString}"`);
            return distanceKm;
        } catch (error) {
            this.logger.error('Error calculating distance:', error);
            return null;
        }
    }
}

export default Singleton.getInstance(GoogleMapsService);
