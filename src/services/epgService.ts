export const fetchPreparedData = async () => {
  const dataUrl = '/data.json';

  try {
    const response = await fetch(dataUrl);

    if (!response.ok) {
      throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error(`Échec de la récupération des données depuis ${dataUrl}:`, error);
    throw error;
  }
};
