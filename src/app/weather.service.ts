import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  constructor(private http: HttpClient) {}

  // pass relative path like: data/2.5/forecast?... (query included)
  getWeather(endpoint: string) {
    return this.http.get(environment.weatherApiUrl + endpoint);
  }

  // Teleport city search: cities/?search=NAME&limit=6
  getCity(endpoint: string) {
    return this.http.get(environment.cityApiUrl + endpoint);
  }
}
