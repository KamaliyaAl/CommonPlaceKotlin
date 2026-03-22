// Simple shared store to pass location back from picker to form
// This avoids navigation params issues with new screen instances
export const locationStore = {
  selected: null as { latitude: number; longitude: number } | null
};
