export interface CityPreset {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  label: string;
  flag: string;
}

export const POPULAR_CITIES: CityPreset[] = [
  // Ukraine
  {
    id: 'ua-kyiv',
    name: 'Kyiv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 50.4501,
    lng: 30.5234,
    label: 'Kyiv, Ukraine',
    flag: 'UA',
  },
  {
    id: 'ua-lviv',
    name: 'Lviv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 49.8397,
    lng: 24.0297,
    label: 'Lviv, Ukraine',
    flag: 'UA',
  },
  {
    id: 'ua-odesa',
    name: 'Odesa',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 46.4825,
    lng: 30.7233,
    label: 'Odesa, Ukraine',
    flag: 'UA',
  },
  {
    id: 'ua-kharkiv',
    name: 'Kharkiv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 49.9935,
    lng: 36.2304,
    label: 'Kharkiv, Ukraine',
    flag: 'UA',
  },
  {
    id: 'ua-dnipro',
    name: 'Dnipro',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 48.4647,
    lng: 35.0462,
    label: 'Dnipro, Ukraine',
    flag: 'UA',
  },

  // Poland
  {
    id: 'pl-warsaw',
    name: 'Warsaw',
    country: 'Poland',
    countryCode: 'PL',
    lat: 52.2297,
    lng: 21.0122,
    label: 'Warsaw, Poland',
    flag: 'PL',
  },
  {
    id: 'pl-krakow',
    name: 'Krakow',
    country: 'Poland',
    countryCode: 'PL',
    lat: 50.0647,
    lng: 19.945,
    label: 'Krakow, Poland',
    flag: 'PL',
  },
  {
    id: 'pl-wroclaw',
    name: 'Wroclaw',
    country: 'Poland',
    countryCode: 'PL',
    lat: 51.1079,
    lng: 17.0385,
    label: 'Wroclaw, Poland',
    flag: 'PL',
  },
  {
    id: 'pl-gdansk',
    name: 'Gdansk',
    country: 'Poland',
    countryCode: 'PL',
    lat: 54.352,
    lng: 18.6466,
    label: 'Gdansk, Poland',
    flag: 'PL',
  },

  // Germany
  {
    id: 'de-berlin',
    name: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    lat: 52.52,
    lng: 13.405,
    label: 'Berlin, Germany',
    flag: 'DE',
  },
  {
    id: 'de-munich',
    name: 'Munich',
    country: 'Germany',
    countryCode: 'DE',
    lat: 48.1351,
    lng: 11.582,
    label: 'Munich, Germany',
    flag: 'DE',
  },
  {
    id: 'de-frankfurt',
    name: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    lat: 50.1109,
    lng: 8.6821,
    label: 'Frankfurt, Germany',
    flag: 'DE',
  },
  {
    id: 'de-hamburg',
    name: 'Hamburg',
    country: 'Germany',
    countryCode: 'DE',
    lat: 53.5511,
    lng: 9.9937,
    label: 'Hamburg, Germany',
    flag: 'DE',
  },

  // United Kingdom
  {
    id: 'gb-london',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    label: 'London, United Kingdom',
    flag: 'GB',
  },
  {
    id: 'gb-manchester',
    name: 'Manchester',
    country: 'United Kingdom',
    countryCode: 'GB',
    lat: 53.4808,
    lng: -2.2426,
    label: 'Manchester, United Kingdom',
    flag: 'GB',
  },

  // France
  {
    id: 'fr-paris',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    lat: 48.8566,
    lng: 2.3522,
    label: 'Paris, France',
    flag: 'FR',
  },
  {
    id: 'fr-lyon',
    name: 'Lyon',
    country: 'France',
    countryCode: 'FR',
    lat: 45.764,
    lng: 4.8357,
    label: 'Lyon, France',
    flag: 'FR',
  },

  // United States
  {
    id: 'us-nyc',
    name: 'New York',
    country: 'United States',
    countryCode: 'US',
    lat: 40.7308,
    lng: -73.9973,
    label: 'Greenwich Village, NYC',
    flag: 'US',
  },
  {
    id: 'us-sf',
    name: 'San Francisco',
    country: 'United States',
    countryCode: 'US',
    lat: 37.7749,
    lng: -122.4194,
    label: 'San Francisco, CA',
    flag: 'US',
  },
  {
    id: 'us-austin',
    name: 'Austin',
    country: 'United States',
    countryCode: 'US',
    lat: 30.2672,
    lng: -97.7431,
    label: 'Austin, TX',
    flag: 'US',
  },
  {
    id: 'us-chicago',
    name: 'Chicago',
    country: 'United States',
    countryCode: 'US',
    lat: 41.8781,
    lng: -87.6298,
    label: 'Chicago, IL',
    flag: 'US',
  },

  // Other European Hubs
  {
    id: 'cz-prague',
    name: 'Prague',
    country: 'Czech Republic',
    countryCode: 'CZ',
    lat: 50.0755,
    lng: 14.4378,
    label: 'Prague, Czech Republic',
    flag: 'CZ',
  },
  {
    id: 'es-barcelona',
    name: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    lat: 41.3879,
    lng: 2.1699,
    label: 'Barcelona, Spain',
    flag: 'ES',
  },
  {
    id: 'nl-amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    lat: 52.3676,
    lng: 4.9041,
    label: 'Amsterdam, Netherlands',
    flag: 'NL',
  },
];

export const COUNTRIES = [
  { code: 'UA', name: 'Ukraine' },
  { code: 'PL', name: 'Poland' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'United States' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
];

export async function searchGlobalCities(query: string): Promise<CityPreset[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return POPULAR_CITIES;

  // 1. Search in presets first
  const matchedPresets = POPULAR_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(clean) ||
      c.country.toLowerCase().includes(clean) ||
      c.label.toLowerCase().includes(clean)
  );

  if (matchedPresets.length >= 3) {
    return matchedPresets;
  }

  // 2. Query OpenStreetMap Nominatim for any arbitrary city if under 3 matches
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        clean
      )}&format=json&addressdetails=1&limit=5`,
      {
        headers: {
          'User-Agent': 'LeaveTheRoom/1.0 (contact@leavetheroom.tech)',
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const nominatimResults: CityPreset[] = data.map((item: any) => {
        const cityName =
          item.address?.city ||
          item.address?.town ||
          item.address?.village ||
          item.address?.municipality ||
          item.name;
        const country = item.address?.country || '';
        const countryCode = (item.address?.country_code || '').toUpperCase();
        return {
          id: `nom-${item.place_id}`,
          name: cityName,
          country,
          countryCode,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          label: `${cityName}, ${country}`,
          flag: countryCode || 'WORLD',
        };
      });

      const combined = [...matchedPresets];
      nominatimResults.forEach((nom) => {
        if (!combined.some((c) => Math.abs(c.lat - nom.lat) < 0.1 && Math.abs(c.lng - nom.lng) < 0.1)) {
          combined.push(nom);
        }
      });
      return combined;
    }
  } catch {
    // fallback to preset matches if offline or rate-limited
  }

  return matchedPresets;
}
