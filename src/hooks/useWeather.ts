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
  // @ts-ignore
  const API_KEY = process.env.HubCrm || import.meta.env.VITE_HUBCRM || import.meta.env.VITE_OPENWEATHER_KEY;

  useEffect(() => {
    if (!API_KEY) {
      console.warn('[useWeather] OpenWeather API Key (HubCrm) não encontrada no ambiente.');
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
          setError(null);
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
            // Fallback para São Paulo
            fetchWeather(-23.5505, -46.6333);
          }
        );
      } else {
        fetchWeather(-23.5505, -46.6333);
      }
    };

    // Executa imediatamente na primeira vez
    getLocation();

    // Configura a atualização automática a cada 60 minutos (1 hora)
    const interval = setInterval(() => {
      console.log('[useWeather] Atualizando clima automaticamente...');
      getLocation();
    }, 60 * 60 * 1000); // 3.600.000 ms

    // Limpa o intervalo ao desmontar o componente
    return () => clearInterval(interval);
  }, [API_KEY]);

  return { weather, loading, error };
}
