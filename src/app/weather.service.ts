import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// import { environment } from '../../';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  constructor(private http :HttpClient) { }

  getWeather(endpoint:any){
    return this.http.get(environment.weatherApiUrl + endpoint)
  }
  getCity(endpoint :any){
    return this.http.get(environment.cityApiUrl + endpoint)
  }


}
