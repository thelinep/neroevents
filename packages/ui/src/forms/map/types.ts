export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapPin extends MapCoordinate {
  id: string;
  label?: string;
}

export interface MapArea {
  id: string;
  label?: string;
  coordinates: MapCoordinate[];
}

export interface MapInputController {
  addPin?: (
    pin: MapPin,
  ) => void;

  updatePin?: (
    pin: MapPin,
  ) => void;

  removePin?: (
    id: string,
  ) => void;

  clearPins?: () => void;

  addArea?: (
    area: MapArea,
  ) => void;

  updateArea?: (
    area: MapArea,
  ) => void;

  removeArea?: (
    id: string,
  ) => void;

  clearAreas?: () => void;
}