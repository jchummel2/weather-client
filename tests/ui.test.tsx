import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LaunchScreen } from '../src/ui/LaunchScreen';
import { WeatherScreen } from '../src/ui/WeatherScreen';

describe('UI rendering', () => {
  it('shows the launch panel heading and action button', () => {
    render(<LaunchScreen onDone={() => undefined} />);

    expect(screen.getByRole('heading', { name: /local weather, without typing\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use my current location/i })).toBeInTheDocument();
  });

  it('renders the current weather summary and forecast controls', () => {
    const current = {
      '@context': 'https://schema.org' as const,
      '@type': 'WeatherForecast' as const,
      geo: { '@type': 'GeoCoordinates' as const, latitude: 42.5, longitude: -94.17 },
      name: 'Today',
      description: 'Clear',
      temperature: { '@type': 'QuantitativeValue' as const, value: 70, unitText: 'F' },
      windSpeed: '5 mph',
      windDirection: 'N',
      dateModified: '2024-01-01T12:00:00Z',
    };

    const forecast = {
      '@context': 'https://schema.org' as const,
      '@type': 'ItemList' as const,
      geo: current.geo,
      dateModified: '2024-01-01T12:00:00Z',
      itemListElement: [
        { ...current, name: 'Tonight' },
        { ...current, name: 'Tomorrow' },
      ],
    };

    render(
      <WeatherScreen
        current={current}
        forecast={forecast}
        location={{ latitude: 42.5, longitude: -94.17, city: 'Fort Dodge' }}
      />
    );

    expect(screen.getByText('Fort Dodge')).toBeInTheDocument();
    expect(screen.getByText('Right now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show earlier forecast/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show later forecast/i })).toBeInTheDocument();
  });
});
