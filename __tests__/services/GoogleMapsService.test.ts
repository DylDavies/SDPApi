import { GoogleMapsService } from '../../src/app/services/GoogleMapsService';

// Mock LoggingService
jest.mock('../../src/app/services/LoggingService', () => {
    return {
        LoggingService: jest.fn().mockImplementation(() => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        }))
    };
});

// Mock Singleton
jest.mock('../../src/app/models/classes/Singleton', () => {
    return {
        Singleton: {
            getInstance: jest.fn().mockImplementation((ClassType) => {
                if (ClassType.name === 'LoggingService') {
                    return {
                        info: jest.fn(),
                        error: jest.fn(),
                        warn: jest.fn()
                    };
                }
                return new ClassType();
            })
        }
    };
});

global.fetch = jest.fn();

describe('GoogleMapsService', () => {
    let googleMapsService: GoogleMapsService;
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        process.env.GOOGLE_MAPS_API_KEY = mockApiKey;
        googleMapsService = new GoogleMapsService();
        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should initialize successfully', async () => {
            await expect(googleMapsService.init()).resolves.not.toThrow();
        });
    });

    describe('getAutocompleteSuggestions', () => {
        it('should return autocomplete suggestions successfully', async () => {
            const mockData = {
                predictions: [
                    {
                        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
                        description: '123 Main St, Sydney NSW, Australia',
                        structured_formatting: {
                            main_text: '123 Main St',
                            secondary_text: 'Sydney NSW, Australia'
                        }
                    },
                    {
                        place_id: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM',
                        description: '123 Market St, Sydney NSW 2000, Australia',
                        structured_formatting: {
                            main_text: '123 Market St',
                            secondary_text: 'Sydney NSW 2000, Australia'
                        }
                    }
                ],
                status: 'OK'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            const result = await googleMapsService.getAutocompleteSuggestions('123 Main');

            expect(global.fetch).toHaveBeenCalled();
            expect(result).toEqual([
                {
                    placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
                    description: '123 Main St, Sydney NSW, Australia',
                    mainText: '123 Main St',
                    secondaryText: 'Sydney NSW, Australia'
                },
                {
                    placeId: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM',
                    description: '123 Market St, Sydney NSW 2000, Australia',
                    mainText: '123 Market St',
                    secondaryText: 'Sydney NSW 2000, Australia'
                }
            ]);
        });

        it('should return empty array for ZERO_RESULTS', async () => {
            const mockData = {
                predictions: [],
                status: 'ZERO_RESULTS'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            const result = await googleMapsService.getAutocompleteSuggestions('');

            expect(result).toEqual([]);
        });

        it('should throw error when API key is not configured', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
            const service = new GoogleMapsService();

            await expect(
                service.getAutocompleteSuggestions('123 Main')
            ).rejects.toThrow('Google Maps API key is not configured');
        });

        it('should throw error for non-OK status', async () => {
            const mockData = {
                status: 'REQUEST_DENIED',
                error_message: 'Invalid API key'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            await expect(
                googleMapsService.getAutocompleteSuggestions('123 Main')
            ).rejects.toThrow('Failed to get autocomplete suggestions: REQUEST_DENIED');
        });
    });

    describe('validateAddressFromPlaceId', () => {
        it('should validate address and return structured data successfully', async () => {
            const mockData = {
                results: [
                    {
                        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
                        formatted_address: '123 Main St, Sydney NSW 2000, Australia',
                        address_components: [
                            {
                                long_name: '123',
                                short_name: '123',
                                types: ['street_number']
                            },
                            {
                                long_name: 'Main Street',
                                short_name: 'Main St',
                                types: ['route']
                            },
                            {
                                long_name: 'Sydney',
                                short_name: 'Sydney',
                                types: ['locality', 'political']
                            },
                            {
                                long_name: 'New South Wales',
                                short_name: 'NSW',
                                types: ['administrative_area_level_1', 'political']
                            },
                            {
                                long_name: '2000',
                                short_name: '2000',
                                types: ['postal_code']
                            },
                            {
                                long_name: 'Australia',
                                short_name: 'AU',
                                types: ['country', 'political']
                            }
                        ],
                        geometry: {
                            location: {
                                lat: -33.8688,
                                lng: 151.2093
                            }
                        }
                    }
                ],
                status: 'OK'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            const result = await googleMapsService.validateAddressFromPlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4');

            expect(result).toEqual({
                placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
                formattedAddress: '123 Main St, Sydney NSW 2000, Australia',
                streetAddress: '123 Main Street',
                city: 'Sydney',
                state: 'New South Wales',
                postalCode: '2000',
                country: 'Australia'
            });
        });

        it('should handle addresses without street number', async () => {
            const mockData = {
                results: [
                    {
                        place_id: 'ChIJ1234',
                        formatted_address: 'Main St, Sydney NSW 2000, Australia',
                        address_components: [
                            {
                                long_name: 'Main Street',
                                short_name: 'Main St',
                                types: ['route']
                            },
                            {
                                long_name: 'Sydney',
                                short_name: 'Sydney',
                                types: ['locality', 'political']
                            },
                            {
                                long_name: 'New South Wales',
                                short_name: 'NSW',
                                types: ['administrative_area_level_1', 'political']
                            },
                            {
                                long_name: '2000',
                                short_name: '2000',
                                types: ['postal_code']
                            },
                            {
                                long_name: 'Australia',
                                short_name: 'AU',
                                types: ['country', 'political']
                            }
                        ]
                    }
                ],
                status: 'OK'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            const result = await googleMapsService.validateAddressFromPlaceId('ChIJ1234');

            expect(result.streetAddress).toBe('Main Street');
            expect(result.city).toBe('Sydney');
        });

        it('should handle addresses with minimal components', async () => {
            const mockData = {
                results: [
                    {
                        place_id: 'ChIJ1234',
                        formatted_address: 'Sydney, Australia',
                        address_components: [
                            {
                                long_name: 'Sydney',
                                short_name: 'Sydney',
                                types: ['locality', 'political']
                            },
                            {
                                long_name: 'Australia',
                                short_name: 'AU',
                                types: ['country', 'political']
                            }
                        ]
                    }
                ],
                status: 'OK'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            const result = await googleMapsService.validateAddressFromPlaceId('ChIJ1234');

            expect(result.streetAddress).toBeUndefined();
            expect(result.city).toBe('Sydney');
            expect(result.state).toBeUndefined();
            expect(result.postalCode).toBeUndefined();
            expect(result.country).toBe('Australia');
        });

        it('should throw error when API key is not configured', async () => {
            process.env.GOOGLE_MAPS_API_KEY = '';
            const service = new GoogleMapsService();

            await expect(
                service.validateAddressFromPlaceId('ChIJ1234')
            ).rejects.toThrow('Google Maps API key is not configured');
        });

        it('should throw error for non-OK status', async () => {
            const mockData = {
                status: 'REQUEST_DENIED',
                error_message: 'API key not valid'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            await expect(
                googleMapsService.validateAddressFromPlaceId('ChIJ1234')
            ).rejects.toThrow('Failed to validate address: REQUEST_DENIED');
        });

        it('should throw error when no results found', async () => {
            const mockData = {
                results: [],
                status: 'ZERO_RESULTS'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            await expect(
                googleMapsService.validateAddressFromPlaceId('invalid-place-id')
            ).rejects.toThrow('Failed to validate address: ZERO_RESULTS');
        });
    });

    describe('validateAddressFromString', () => {
        it('should validate address from string successfully', async () => {
            const mockData = {
                results: [
                    {
                        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
                        formatted_address: '123 Main St, Sydney NSW 2000, Australia',
                        address_components: [
                            {
                                long_name: '123',
                                short_name: '123',
                                types: ['street_number']
                            },
                            {
                                long_name: 'Main Street',
                                short_name: 'Main St',
                                types: ['route']
                            },
                            {
                                long_name: 'Sydney',
                                short_name: 'Sydney',
                                types: ['locality', 'political']
                            },
                            {
                                long_name: 'New South Wales',
                                short_name: 'NSW',
                                types: ['administrative_area_level_1', 'political']
                            },
                            {
                                long_name: '2000',
                                short_name: '2000',
                                types: ['postal_code']
                            },
                            {
                                long_name: 'Australia',
                                short_name: 'AU',
                                types: ['country', 'political']
                            }
                        ]
                    }
                ],
                status: 'OK'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            const result = await googleMapsService.validateAddressFromString('123 Main St Sydney');

            expect(result).toEqual({
                placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
                formattedAddress: '123 Main St, Sydney NSW 2000, Australia',
                streetAddress: '123 Main Street',
                city: 'Sydney',
                state: 'New South Wales',
                postalCode: '2000',
                country: 'Australia'
            });
        });

        it('should throw error when API key is not configured', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
            const service = new GoogleMapsService();

            await expect(
                service.validateAddressFromString('123 Main St')
            ).rejects.toThrow('Google Maps API key is not configured');
        });

        it('should throw error for invalid address string', async () => {
            const mockData = {
                results: [],
                status: 'ZERO_RESULTS'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockData
            });

            await expect(
                googleMapsService.validateAddressFromString('invalid address xyz')
            ).rejects.toThrow('Failed to validate address: ZERO_RESULTS');
        });
    });
});
