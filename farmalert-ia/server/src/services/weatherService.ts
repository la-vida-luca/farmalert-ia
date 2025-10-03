import axios from 'axios';
import { WeatherData, WeatherResponse } from '../types';
import { db } from '../config/database';
import logger from '../utils/logger';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '216cc64624e339d6f32a6a4c859696b1';
const OPENWEATHER_BASE_URL = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';

export class WeatherService {
  static async getCurrentWeather(lat: number, lon: number): Promise<WeatherResponse> {
    try {
      const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'fr'
        }
      });

      const data = response.data;
      
      return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg || 0,
        precipitation: data.rain?.['1h'] || 0,
        cloudiness: data.clouds.all,
        visibility: data.visibility / 1000, // Convertir en km
        uvIndex: 0, // Pas disponible dans l'API gratuite
        weatherCondition: data.weather[0].main,
        weatherDescription: data.weather[0].description,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des données météo:', error);
      throw new Error('Impossible de récupérer les données météo');
    }
  }

  static async getWeatherForecast(lat: number, lon: number): Promise<WeatherResponse[]> {
    try {
      const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'fr'
        }
      });

      return response.data.list.slice(0, 5).map((item: any) => ({
        temperature: item.main.temp,
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind.speed,
        windDirection: item.wind.deg || 0,
        precipitation: item.rain?.['3h'] || 0,
        cloudiness: item.clouds.all,
        visibility: item.visibility / 1000,
        uvIndex: 0,
        weatherCondition: item.weather[0].main,
        weatherDescription: item.weather[0].description,
        timestamp: item.dt_txt
      }));
    } catch (error) {
      logger.error('Erreur lors de la récupération des prévisions météo:', error);
      throw new Error('Impossible de récupérer les prévisions météo');
    }
  }

  static async saveWeatherData(farmId: number, weatherData: WeatherResponse): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO weather_data (
          farmId, temperature, humidity, pressure, windSpeed, windDirection,
          precipitation, cloudiness, visibility, uvIndex, timestamp,
          weatherCondition, weatherDescription
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        farmId,
        weatherData.temperature,
        weatherData.humidity,
        weatherData.pressure,
        weatherData.windSpeed,
        weatherData.windDirection,
        weatherData.precipitation,
        weatherData.cloudiness,
        weatherData.visibility,
        weatherData.uvIndex,
        weatherData.timestamp,
        weatherData.weatherCondition,
        weatherData.weatherDescription
      ], function(err) {
        if (err) {
          logger.error('Erreur lors de la sauvegarde des données météo:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  static async getWeatherHistory(farmId: number, limit: number = 24): Promise<WeatherData[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM weather_data 
        WHERE farmId = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;

      db.all(sql, [farmId, limit], (err, rows: any[]) => {
        if (err) {
          logger.error('Erreur lors de la récupération de l\'historique météo:', err);
          reject(err);
        } else {
          resolve(rows as WeatherData[]);
        }
      });
    });
  }

  static async updateWeatherForAllFarms(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, latitude, longitude FROM farms', async (err, farms: any[]) => {
        if (err) {
          logger.error('Erreur lors de la récupération des fermes:', err);
          reject(err);
          return;
        }

        try {
          for (const farm of farms) {
            const weatherData = await this.getCurrentWeather(farm.latitude, farm.longitude);
            await this.saveWeatherData(farm.id, weatherData);
            logger.info(`Données météo mises à jour pour la ferme ${farm.id}`);
          }
          resolve();
        } catch (error) {
          logger.error('Erreur lors de la mise à jour des données météo:', error);
          reject(error);
        }
      });
    });
  }
}