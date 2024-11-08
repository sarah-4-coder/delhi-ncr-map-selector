'use client'

import { useEffect, useRef } from 'react'
import { LatLngTuple, LatLngBoundsExpression, Map as LeafletMap, TileLayer, Marker, Polygon, Icon } from 'leaflet'
import { MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type MapProps = {
  center: LatLngTuple
  zoom: number
  bounds: LatLngBoundsExpression
  markers: LatLngTuple[]
  selectedArea: LatLngTuple[]
  currentLocation: LatLngTuple | null
  onMapClick: (latlng: LatLngTuple) => void
}

const createCustomIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

const markerIcon = createCustomIcon('#3b82f6') // Blue color
const currentLocationIcon = createCustomIcon('#ef4444') // Red color

export default function Map({ center, zoom, bounds, markers, selectedArea, currentLocation, onMapClick }: MapProps) {
  const mapRef = useRef<LeafletMap | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = new LeafletMap(mapContainerRef.current, {
        center,
        zoom,
        maxBounds: bounds,
        minZoom: 10,
        scrollWheelZoom: false,
      })

      const tileLayer = new TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })

      mapRef.current.addLayer(tileLayer)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [bounds])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom)
    }
  }, [center, zoom])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof Marker || layer instanceof Polygon) {
          mapRef.current?.removeLayer(layer)
        }
      })

      markers.forEach((position, idx) => {
        new Marker(position, { icon: markerIcon })
          .addTo(mapRef.current!)
          .bindPopup(`Marker ${idx + 1}`)
      })

      if (selectedArea.length > 2) {
        new Polygon(selectedArea).addTo(mapRef.current)
      }

      if (currentLocation) {
        new Marker(currentLocation, { icon: currentLocationIcon })
          .addTo(mapRef.current)
          .bindPopup('You are here')
      }
    }
  }, [markers, selectedArea, currentLocation])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.on('click', (e: any) => {
        onMapClick([e.latlng.lat, e.latlng.lng])
      })
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click')
      }
    }
  }, [onMapClick])

  return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }}></div>
}
