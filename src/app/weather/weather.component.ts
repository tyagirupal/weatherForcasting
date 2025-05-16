import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WeatherService } from '../weather.service';
import { HttpClient } from '@angular/common/http';
// import { Subscription, debounceTime, distinctUntilChanged, map, share, timer } from 'rxjs';

import { FormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { environment } from 'src/environments/environment';
// import { WeatherService } from '../weather.service';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss']
})
export class WeatherComponent implements OnInit {

  geoLocationData: any;
  deniedMsg: string = '';
  weatherDetails: any;
  photo: string = '/assets/images/bg-weather.png';
  math = Math;
  date = new Date();
  search!: FormGroup;
  // subscription: Subscription | undefined;
  showCity: any;
  searchList: any;
  cityData: any;
  environment = environment;
  checked = false;
  disabled = false;
  color = false;
  day = new Date().getDay();
  weatherDataDay : any = [];

  
  fiveDyafORCAST = [
    {img:'../../assets/icons/clouds.png' , temp:this.weatherDataDay}
  ]

  constructor(private snackBar :MatSnackBar, private api :WeatherService, private fb : FormBuilder, private http : HttpClient) {
   console.log(this.date);
   
    navigator.geolocation.getCurrentPosition((position)=>{
      console.log(position);
      console.log('latitude',position.coords.latitude);
      console.log('longitude', position.coords.longitude);
      let lat = position.coords.latitude;
      let long = position.coords.longitude;
      this.getWeather(lat , long)
      // const time = position.coords.ti
    },
    (error:any)=>{
      console.log(error);

      this.snackBar.open('Can not get the location', 'OK', {
        duration: 3000, 
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['snackbar-error'] 
      });
    }
    )
  }
  
  ngOnInit(): void {
    // this.geoLocation();
    let body = document.body;
    body.style.backgroundColor = 'white';
      body.style.color = 'black !important'
  }


  getWeather(lat: any, lon: any) {
 
    this.api.getWeather(`data/2.5/forecast/?lat=${lat}&lon=${lon}&units=metric&appid=${environment.weatherApiKey}`).subscribe((response: any) => {
      console.log(response);
      console.log(response.list[0].dt_txt);
      console.log(response.city.name);

      
      this.weatherDetails ={
        cityName:response.city.name,
        countryName : response.city.country,
        wind :response.list[0].wind,
        temprature :response.list[0].main.temp,
        maxTemp :response.list[0].main.temp_max,
        minTemp : response.list[0].main.temp_min,
        humidity :response.list[0].main.humidity,
        cloudy : response.list[0].clouds,
        pressure :response.list[0].main.pressure,
        feels_like : response.list[0].main.feels_like,
        sunRise : response.list[0].sys.sunrise,
        sunSet : response.list[0].sys.sunset,
      }

      this.weatherDataDay ={
        maxTemp :response.list[5].main.temp_max,
        date : response.list[5].dt_txt,
        maxTempTwo :response.list[13].main.temp_max,
        dateTwo : response.list[13].dt_txt,
        maxTempThree :response.list[21].main.temp_max,
        dateThree : response.list[21].dt_txt,
        maxTempFour :response.list[29].main.temp_max,
        dateFour : response.list[29].dt_txt,
       
      }
      console.log( response.list[29].dt_txt);
      console.log(response.list[29].main.temp_max);
      console.log(response.list[21].dt_txt);
      console.log(response.list[21].main.temp_max);
      console.log(response.list[13].dt_txt);
      console.log(response.list[13].main.temp_max);
      console.log(response.list[5].dt_txt);
      console.log(response.list[5].main.temp_max);
      
console.log(this.weatherDataDay);


      
      console.log(this.weatherDetails);
    })
  }

  watchPostion(){
    navigator.geolocation.watchPosition((position)=>{
        console.log('latitude',position.coords.latitude);
        console.log('longitude', position.coords.longitude);
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
    })
  }

  mode(event){
    console.log(event);
    this.checked = event.checked;
    
    let body = document.body;
   
    console.log("dfghjk");
    

    if(!this.checked){
      body.style.backgroundColor = 'white';
      body.style.color = 'black !important'
    }
    else{
      body.style.backgroundColor = 'rgb(68, 68, 68)';
      body.style.color = 'white'
    }
  }

}
