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
      periodName: 'Today',
      shortForecast: 'Clear',
      temperature: 70,
      temperatureUnit: 'F',
      windSpeed: '5 mph',
      windDirection: 'N',
      fetchedAt: '2024-01-01T12:00:00Z',
    };

    const forecast = {
      fetchedAt: '2024-01-01T12:00:00Z',
      periods: [
        { ...current, periodName: 'Tonight' },
        { ...current, periodName: 'Tomorrow' },
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
