import { useState, useEffect } from 'react';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A chave da API deve estar configurada no Vercel/Ambiente
  // O usuário mencionou o nome "HubCrm"
  const API_KEY = import.meta.env.VITE_HUBCRM || import.meta.env.VITE_OPENWEATHER_KEY;

  useEffect(() => {
    if (!API_KEY) {
      setLoading(false);
      return;
    }

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`
        );
        const data = await response.json();

        if (response.ok) {
          setWeather({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            city: data.name
          });
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Falha ao buscar clima');
      } finally {
        setLoading(false);
      }
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchWeather(position.coords.latitude, position.coords.longitude);
          },
          () => {
            // Fallback para uma cidade padrão (ex: São Paulo) se o usuário negar permissão
            // lat: -23.5505, lon: -46.6333
            fetchWeather(-23.5505, -46.6333);
          }
        );
      } else {
        fetchWeather(-23.5505, -46.6333);
      }
    };

    getLocation();
  }, [API_KEY]);

  return { weather, loading, error };
}
