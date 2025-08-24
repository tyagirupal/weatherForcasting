import { Component, HostBinding, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { WeatherService } from '../weather.service';
import { environment } from 'src/environments/environment';

type OWItem = {
  dt: number;
  dt_txt: string;
  main: { temp: number; temp_min: number; temp_max: number; pressure: number; humidity: number; feels_like: number; };
  weather: { main: string; description: string; icon: string }[];
  wind: { speed: number };
  clouds: { all: number };
};
type OWForecastResponse = {
  city: { name: string; country: string; sunrise: number; sunset: number; timezone: number };
  list: OWItem[];
};
type GeoCity = { name: string; country: string; state?: string; lat: number; lon: number };

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss']
})
export class WeatherComponent implements OnInit {
  @HostBinding('class.dark') dark = false;

  now = new Date();
  search!: FormGroup;

  // suggestions via OpenWeather Geocoding API (no 3rd-party domain)
  suggestions: GeoCity[] = [];
  isSearching = false;

  current: {
    cityName: string;
    country: string;
    temp: number;
    tempMax: number;
    tempMin: number;
    humidity: number;
    pressure: number;
    windKmh: number;
    clouds: number;
    feelsLike: number;
    sunrise: number;
    sunset: number;
    icon: string;
    description: string;
  } | null = null;

  // next 24h in 3-hour steps (8 cards)
  next24h: { at: string; temp: number; icon: string; description: string }[] = [];

  // upcoming 5 days (daily)
  forecast5d: { date: string; tempMax: number; icon: string; description: string }[] = [];

  constructor(
    private snack: MatSnackBar,
    private api: WeatherService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.search = this.fb.group({ q: [''] });

    // live suggestions after 3+ chars
    this.search.get('q')!.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((q: string) => {
        const text = (q || '').trim();
        if (text.length < 3) { this.suggestions = []; return; }
        this.fetchGeoSuggestions(text);
      });

    this.useCurrentLocation();
  }

  toggleDarkMode(checked: boolean) { this.dark = checked; }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.snack.open('Geolocation not supported by your browser', 'OK', { duration: 2500 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => this.fetchByCoords(pos.coords.latitude, pos.coords.longitude),
      _ => this.snack.open('Can’t get your location. Type a city instead.', 'OK', { duration: 3000 })
    );
  }

  // ---------- GEO SUGGESTIONS (OpenWeather) ----------
  private fetchGeoSuggestions(q: string) {
    this.isSearching = true;
    // https://api.openweathermap.org/geo/1.0/direct?q=Gur&limit=6&appid=KEY
    const url = `geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${environment.weatherApiKey}`;
    this.api.getWeather(url).subscribe({
      next: (res: any) => {
        this.suggestions = (res as any[]).map(r => ({
          name: r.name,
          country: r.country,
          state: r.state,
          lat: r.lat,
          lon: r.lon
        }));
        this.isSearching = false;
      },
      error: _ => { this.suggestions = []; this.isSearching = false; }
    });
  }

  onCitySelected(ev: MatAutocompleteSelectedEvent) {
    const picked = this.suggestions.find(s => `${s.name}, ${s.state ? s.state + ', ' : ''}${s.country}` === ev.option.value)
               ?? this.suggestions[0];
    if (picked) {
      this.search.get('q')!.setValue(`${picked.name}, ${picked.state ? picked.state + ', ' : ''}${picked.country}`, { emitEvent: false });
      this.fetchByCoords(picked.lat, picked.lon);
    }
  }

  onSubmitSearch() {
    const q = (this.search.get('q')!.value || '').trim();
    if (q.length < 3) return;
    // If user pressed Enter without selecting suggestion, try city-by-name
    const url = `data/2.5/forecast?q=${encodeURIComponent(q)}&units=metric&appid=${environment.weatherApiKey}`;
    this.api.getWeather(url).subscribe({
      next: (res: OWForecastResponse) => this.hydrate(res),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) this.snack.open('City not found. Try picking a suggestion.', 'OK', { duration: 3000 });
        else this.handleError(err);
      }
    });
  }

  // ---------- WEATHER FETCH ----------
  fetchByCoords(lat: number, lon: number) {
    const url = `data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${environment.weatherApiKey}`;
    this.api.getWeather(url).subscribe({
      next: (res: OWForecastResponse) => this.hydrate(res),
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  private hydrate(res: OWForecastResponse) {
    const first = res.list[0];
    const windKmh = +(first.wind.speed * 3.6).toFixed(1);

    this.current = {
      cityName: res.city.name,
      country: res.city.country,
      temp: first.main.temp,
      tempMax: first.main.temp_max,
      tempMin: first.main.temp_min,
      humidity: first.main.humidity,
      pressure: first.main.pressure,  // hPa
      windKmh,
      clouds: first.clouds.all,
      feelsLike: first.main.feels_like,
      sunrise: res.city.sunrise,
      sunset: res.city.sunset,
      icon: first.weather?.[0]?.icon ?? '01d',
      description: first.weather?.[0]?.description ?? 'clear'
    };

    // Next 24 hours (3-hour intervals, 8 items)
    this.next24h = res.list.slice(0, 8).map(i => ({
      at: i.dt * 1000 + '',           // store ms as string for template date pipe
      temp: i.main.temp,
      icon: i.weather?.[0]?.icon ?? '01d',
      description: i.weather?.[0]?.description ?? ''
    }));

    // Build 5-day daily using noon slot (fallback to max temp)
    this.forecast5d = this.buildDaily(res.list);
  }

  private buildDaily(list: OWItem[]) {
    const byDate = new Map<string, OWItem[]>();
    for (const item of list) {
      const key = item.dt_txt.split(' ')[0];
      (byDate.get(key) ?? byDate.set(key, []).get(key)!).push(item);
    }
    const out: { date: string; tempMax: number; icon: string; description: string }[] = [];
    for (const [date, items] of byDate) {
      const noon = items.find(i => i.dt_txt.includes('12:00:00'));
      const best = noon ?? items.reduce((a, b) => (b.main.temp_max > a.main.temp_max ? b : a));
      out.push({
        date,
        tempMax: best.main.temp_max,
        icon: best.weather?.[0]?.icon ?? '01d',
        description: best.weather?.[0]?.description ?? ''
      });
    }
    return out.sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, 5);
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message || err.statusText || 'Something went wrong';
    this.snack.open(msg, 'OK', { duration: 3000 });
  }

  // template helpers
  iconUrl(code: string) { return `https://openweathermap.org/img/wn/${code}@2x.png`; }
}
