/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import type { LatLngTuple, LatLngBoundsExpression } from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  MapPin,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DynamicMap = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

// Approximate bounds for Delhi NCR
const delhiNCRBounds: [[number, number], [number, number]] = [
  [28.2, 76.5], // Southwest corner
  [29.0, 77.8], // Northeast corner
];

type Area = {
  _id: string;
  name: string;
  coordinates: LatLngTuple[];
  userId: string;
};

export default function MapComponent() {
  const [markers, setMarkers] = useState<LatLngTuple[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<LatLngTuple[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>([28.6139, 77.209]); // Delhi center
  const [mapZoom, setMapZoom] = useState(10);
  const [latInput, setLatInput] = useState("");
  const [longInput, setLongInput] = useState("");
  const [areaName, setAreaName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLngTuple | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [openCoordinatesAreaId, setOpenCoordinatesAreaId] = useState<
    string | null
  >(null);
  const userId = "user1"; // This should be dynamically set based on logged-in user

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await axios.get(`/api/areas?userId=${userId}`);
        setAreas(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "Error fetching areas:",
            error.response?.data || error.message,
            "Full error object:",
            JSON.stringify(error, null, 2)
          );
          setError(
            `Failed to fetch areas: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          console.error("Unexpected error:", error);
          setError("An unexpected error occurred");
        }
      }
    };

    fetchAreas();
  }, [userId]);

  const handleMapClick = useCallback((latlng: LatLngTuple) => {
    setMarkers((prev) => [...prev, latlng]);
    setError(null);
  }, []);

  const handleAddMarker = useCallback(() => {
    const lat = parseFloat(latInput);
    const long = parseFloat(longInput);
    if (isNaN(lat) || isNaN(long)) {
      setError("Please enter valid latitude and longitude");
      return;
    }
    if (
      lat < delhiNCRBounds[0][0] ||
      lat > delhiNCRBounds[1][0] ||
      long < delhiNCRBounds[0][1] ||
      long > delhiNCRBounds[1][1]
    ) {
      setError("Coordinates are outside Delhi NCR boundaries");
      return;
    }
    const newLocation: LatLngTuple = [lat, long];
    setMarkers((prev) => [...prev, newLocation]);
    setMapCenter(newLocation);
    setLatInput("");
    setLongInput("");
    setError(null);
  }, [latInput, longInput]);

  const handleCreateArea = useCallback(async () => {
    if (markers.length < 3) {
      setError("Please select at least 3 points to create an area");
      return;
    }
    if (!areaName.trim()) {
      setError("Please enter a name for the area");
      return;
    }
    const newArea = {
      name: areaName.trim(),
      coordinates: markers,
      userId,
    };
    try {
      const response = await axios.post("/api/areas", newArea);
      setAreas((prev) => [...prev, response.data]);
      setSelectedArea(markers);
      setMarkers([]);
      setAreaName("");
      setError(null);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error creating area:",
          error.response?.data || error.message
        );
        setError(
          `Failed to create area: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        console.error("Unexpected error:", error);
        setError("An unexpected error occurred while creating the area");
      }
    }
  }, [markers, areaName, userId]);

  const handleClearSelection = useCallback(() => {
    setMarkers([]);
    setError(null);
    setCurrentLocation(null);
  }, []);

  const handleClearArea = useCallback(() => {
    setSelectedArea([]);
    setError(null);
  }, []);

  const handleAreaClick = useCallback((area: Area) => {
    setSelectedArea(area.coordinates);
    if (area.coordinates.length > 0) {
      setMapCenter(area.coordinates[0]);
    }
  }, []);

  const handleDeleteArea = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/areas?id=${id}`);
        setAreas((prev) => prev.filter((area) => area._id !== id));
        if (selectedArea.length > 0) {
          setSelectedArea([]);
        }
      } catch (error) {
        console.error("Error deleting area:", error);
        setError("Failed to delete area");
      }
    },
    [selectedArea]
  );

  const handleFindCurrentLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: LatLngTuple = [latitude, longitude];
          if (
            latitude < delhiNCRBounds[0][0] ||
            latitude > delhiNCRBounds[1][0] ||
            longitude < delhiNCRBounds[0][1] ||
            longitude > delhiNCRBounds[1][1]
          ) {
            setError("Your current location is outside Delhi NCR boundaries");
            return;
          }
          setCurrentLocation(newLocation);
          setMapCenter(newLocation);
          setMarkers((prev) => [...prev, newLocation]);
        },
        (error) => {
          console.error("Error getting location:", error);
          setError(
            "Unable to retrieve your location. Please ensure you have granted permission."
          );
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  }, []);

  const handleSearchLocation = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: searchQuery,
            format: "json",
            limit: 1,
          },
        }
      );

      if (response.data.length > 0) {
        const location = response.data[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);

        if (
          lat < delhiNCRBounds[0][0] ||
          lat > delhiNCRBounds[1][0] ||
          lon < delhiNCRBounds[0][1] ||
          lon > delhiNCRBounds[1][1]
        ) {
          setError("The searched location is outside Delhi NCR boundaries");
          return;
        }

        const newLocation: LatLngTuple = [lat, lon];
        setMarkers((prev) => [...prev, newLocation]);
        setMapCenter(newLocation);
        setSearchQuery("");
        setError(null);
      } else {
        setError("Location not found");
      }
    } catch (error) {
      setError("Error searching location");
    }
  }, [searchQuery]);

  const handleToggleCoordinates = useCallback((areaId: string) => {
    setOpenCoordinatesAreaId((prev) => (prev === areaId ? null : areaId));
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 ">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Delhi NCR Map Selector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="my-4 flex">
            <Label htmlFor="searchLocation"></Label>
            <Input
              id="searchLocation"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address or location"
            />
            <Button onClick={handleSearchLocation} className="w-50 ml-2">
              Search
            </Button>
          </div>
          <div className="h-[400px] w-full mb-4">
            <DynamicMap
              center={mapCenter}
              zoom={mapZoom}
              bounds={delhiNCRBounds}
              markers={markers}
              selectedArea={selectedArea}
              currentLocation={currentLocation}
              onMapClick={handleMapClick}
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="areaName">Area Name</Label>
            <Input
              id="areaName"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="Enter area name"
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button onClick={handleCreateArea}>Create Area</Button>
            <Button variant="outline" onClick={handleClearSelection}>
              Clear Markers
            </Button>
            <Button variant="outline" onClick={handleClearArea}>
              Clear Area
            </Button>
            <Button onClick={handleFindCurrentLocation}>
              <MapPin className="mr-2 h-4 w-4" /> Find My Location
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 my-6">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="Enter latitude"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                value={longInput}
                onChange={(e) => setLongInput(e.target.value)}
                placeholder="Enter longitude"
              />
            </div>
          </div>
          <Button onClick={handleAddMarker} className="w-full mb-4">
            Add Marker
          </Button>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Areas List</CardTitle>
        </CardHeader>
        <CardContent>
          {areas.length === 0 ? (
            <p>No areas created yet.</p>
          ) : (
            <ul>
              {areas
                .filter((area) => area.userId === userId)
                .map((area) => (
                  <li
                    key={area._id}
                    className="flex justify-between items-center mb-2"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className="cursor-pointer"
                        onClick={() => handleAreaClick(area)}
                      >
                        {area.name}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleToggleCoordinates(area._id)}
                        className="flex items-center"
                      >
                        {openCoordinatesAreaId === area._id ? (
                          <ChevronUp />
                        ) : (
                          <ChevronDown />
                        )}{" "}
                        Coordinates
                      </Button>
                      {openCoordinatesAreaId === area._id && (
                        <ul className="list-disc list-inside mt-2">
                          {area.coordinates.map((coord, index) => (
                            <li key={index}>
                              Latitude: {coord[0].toFixed(6)}, Longitude:{" "}
                              {coord[1].toFixed(6)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteArea(area._id)}
                      className="flex items-center"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
