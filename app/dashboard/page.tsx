"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { supabase } from "../../services/supabase";
import { uploadImage } from "../../services/cloudinary";
import { useLang } from "../../context/LangContext";
import { useMaps } from "../../context/MapsContext";

const CATS = [
  { value: "comida", label: "🍽️ Comida" },
  { value: "tours", label: "🎒 Tours" },
  { value: "hospedaje", label: "🏨 Hospedaje" },
  { value: "artesanias", label: "🎨 Artesanías" },
  { value: "entretenimiento", label: "🎶 Entretenimiento" },
];

const TAGS = [
  "barato",
  "lujo",
  "seguro",
  "familiar",
  "romantico",
  "turistico",
  "gastronomico",
  "cultural",
  "vida nocturna",
  "al aire libre",
  "con niños",
  "pet friendly",
  "sin gluten",
];

const DEFAULT_CENTER = { lat: 19.0414, lng: -98.2063 }; // Puebla

export default function Dashboard() {
  const { t } = useLang();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded: mapLoaded } = useMaps();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [openingHours, setOpeningHours] = useState<{
    lunes: { abierto: boolean; inicio: string; fin: string };
    martes: { abierto: boolean; inicio: string; fin: string };
    miercoles: { abierto: boolean; inicio: string; fin: string };
    jueves: { abierto: boolean; inicio: string; fin: string };
    viernes: { abierto: boolean; inicio: string; fin: string };
    sabado: { abierto: boolean; inicio: string; fin: string };
    domingo: { abierto: boolean; inicio: string; fin: string };
  }>({
    lunes: { abierto: true, inicio: "09:00", fin: "20:00" },
    martes: { abierto: true, inicio: "09:00", fin: "20:00" },
    miercoles: { abierto: true, inicio: "09:00", fin: "20:00" },
    jueves: { abierto: true, inicio: "09:00", fin: "20:00" },
    viernes: { abierto: true, inicio: "09:00", fin: "20:00" },
    sabado: { abierto: true, inicio: "10:00", fin: "18:00" },
    domingo: { abierto: false, inicio: "10:00", fin: "18:00" },
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Coordenadas del pin
  const [markerPos, setMarkerPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setAuthChecked(true);
    });
  }, [router]);

  // Cuando el usuario hace clic en el mapa
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = parseFloat(e.latLng.lat().toFixed(7));
    const lng = parseFloat(e.latLng.lng().toFixed(7));
    setMarkerPos({ lat, lng });
    setLatInput(String(lat));
    setLngInput(String(lng));
  }, []);

  // Sincronizar inputs manuales → pin
  const handleLatChange = (v: string) => {
    setLatInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && lngInput) {
      const lng = parseFloat(lngInput);
      if (!isNaN(lng)) {
        setMarkerPos({ lat: n, lng });
        setMapCenter({ lat: n, lng });
      }
    }
  };
  const handleLngChange = (v: string) => {
    setLngInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && latInput) {
      const lat = parseFloat(latInput);
      if (!isNaN(lat)) {
        setMarkerPos({ lat, lng: n });
        setMapCenter({ lat, lng: n });
      }
    }
  };

  // Usar mi ubicación actual
  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(7));
        const lng = parseFloat(pos.coords.longitude.toFixed(7));
        setMarkerPos({ lat, lng });
        setLatInput(String(lat));
        setLngInput(String(lng));
        setMapCenter({ lat, lng });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files].slice(0, 6));
    setImagePreviews((prev) =>
      [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, 6),
    );
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Convertir horarios a formato string
  const formatOpeningHours = () => {
    const days = [
      { key: "lunes", label: "Lun" },
      { key: "martes", label: "Mar" },
      { key: "miercoles", label: "Mié" },
      { key: "jueves", label: "Jue" },
      { key: "viernes", label: "Vie" },
      { key: "sabado", label: "Sáb" },
      { key: "domingo", label: "Dom" },
    ];

    return days
      .map(({ key, label }) => {
        const day = openingHours[key as keyof typeof openingHours];
        if (!day.abierto) return `${label}: Cerrado`;
        return `${label} ${day.inicio}–${day.fin}`;
      })
      .join(", ");
  };

  const createBusiness = async () => {
    setSuccessMsg("");
    setErrorMsg("");
    if (!name.trim() || !category) {
      setErrorMsg(t.fillFields);
      return;
    }
    if (!markerPos) {
      setErrorMsg("📍 Por favor señala la ubicación de tu negocio en el mapa.");
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        try {
          uploadedUrls.push(await uploadImage(file));
        } catch {
          /* skip */
        }
      }

      const { data: negocioData, error } = await supabase
        .from("negocios")
        .insert([
          {
            name,
            category,
            description,
            tags: selectedTags.length > 0 ? selectedTags.join(", ") : null,
            lat: markerPos.lat,
            lng: markerPos.lng,
            image_url: uploadedUrls[0] ?? null,
            owner_id: userData.user?.id,
            phone: phone.trim() || null,
            website: website.trim() || null,
            opening_hours: formatOpeningHours() || null,
          },
        ])
        .select()
        .single();

      if (error) {
        setErrorMsg(t.createError + error.message);
        return;
      }

      if (negocioData && uploadedUrls.length > 0) {
        await supabase.from("negocio_images").insert(
          uploadedUrls.map((url, i) => ({
            negocio_id: negocioData.id,
            url,
            order_index: i,
          })),
        );
      }

      setSuccessMsg(t.createSuccess);
      setName("");
      setCategory("");
      setDescription("");
      setSelectedTags([]);
      setPhone("");
      setWebsite("");
      setOpeningHours({
        lunes: { abierto: true, inicio: "09:00", fin: "20:00" },
        martes: { abierto: true, inicio: "09:00", fin: "20:00" },
        miercoles: { abierto: true, inicio: "09:00", fin: "20:00" },
        jueves: { abierto: true, inicio: "09:00", fin: "20:00" },
        viernes: { abierto: true, inicio: "09:00", fin: "20:00" },
        sabado: { abierto: true, inicio: "10:00", fin: "18:00" },
        domingo: { abierto: false, inicio: "10:00", fin: "18:00" },
      });
      setImageFiles([]);
      setImagePreviews([]);
      setMarkerPos(null);
      setLatInput("");
      setLngInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  if (!authChecked) return null;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "1.5rem",
          color: "var(--text)",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg, var(--teal), var(--teal-dk))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                🌎
              </div>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                }}
              >
                Xplora
                <span
                  style={{
                    background: "var(--orange)",
                    color: "#fff",
                    padding: "1px 6px 2px",
                    borderRadius: "5px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    marginLeft: "4px",
                  }}
                >
                  MX
                </span>
              </span>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => router.push("/")}
              style={{ fontSize: "0.82rem" }}
            >
              ← Volver al mapa
            </button>
          </div>

          <div className="animate-fade-up">
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "1.6rem",
                fontWeight: 800,
                marginBottom: "4px",
              }}
            >
              Registra tu negocio
            </h1>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              Llega a miles de turistas del Mundial 2026
            </p>

            <div
              className="card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Fotos múltiples */}
              <div>
                <label style={labelStyle}>Fotos del negocio (hasta 6)</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                  }}
                >
                  {imagePreviews.map((src, i) => (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        aspectRatio: "1",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <img
                        src={src}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        onClick={() => removeImage(i)}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          background: "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "22px",
                          height: "22px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                      {i === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "4px",
                            left: "4px",
                            background: "var(--teal)",
                            color: "white",
                            fontSize: "0.65rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                  {imagePreviews.length < 6 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        aspectRatio: "1",
                        border: "2px dashed var(--border)",
                        borderRadius: "10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        background: "var(--surface2)",
                        color: "var(--muted)",
                      }}
                    >
                      <span style={{ fontSize: "1.4rem" }}>+</span>
                      <span style={{ fontSize: "0.72rem" }}>Agregar</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: "6px",
                  }}
                >
                  La primera foto será la imagen principal
                </p>
              </div>

              {/* Nombre */}
              <div>
                <label style={labelStyle}>Nombre del negocio *</label>
                <input
                  className="input"
                  placeholder="Ej. Tacos El Güero"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Categoría */}
              <div>
                <label style={labelStyle}>Categoría *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {CATS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        fontFamily: "inherit",
                        textAlign: "left",
                        transition: "all 0.15s",
                        borderColor:
                          category === c.value
                            ? "var(--teal)"
                            : "var(--border)",
                        background:
                          category === c.value
                            ? "var(--teal-a)"
                            : "var(--surface2)",
                        color:
                          category === c.value
                            ? "var(--teal-lt)"
                            : "var(--text)",
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea
                  className="input"
                  placeholder="Cuéntales a los turistas qué ofreces..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* TAGS */}
              <div>
                <label style={labelStyle}>Etiquetas</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        );
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                        borderColor: selectedTags.includes(tag)
                          ? "var(--teal)"
                          : "var(--border)",
                        background: selectedTags.includes(tag)
                          ? "var(--teal-a)"
                          : "var(--surface2)",
                        color: selectedTags.includes(tag)
                          ? "var(--teal-lt)"
                          : "var(--text)",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: "6px",
                  }}
                >
                  Selecciona todas las que apliquen a tu negocio
                </p>
              </div>

              {/* TELÉFONO */}
              <div>
                <label style={labelStyle}>Teléfono / WhatsApp</label>
                <input
                  className="input"
                  placeholder="Ej: +52 222 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* SITIO WEB */}
              <div>
                <label style={labelStyle}>Sitio web</label>
                <input
                  className="input"
                  placeholder="Ej: www.minegocio.mx"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {/* HORARIO */}
              <div>
                <label style={labelStyle}>Horario</label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {[
                    { key: "lunes", label: "Lunes" },
                    { key: "martes", label: "Martes" },
                    { key: "miercoles", label: "Miércoles" },
                    { key: "jueves", label: "Jueves" },
                    { key: "viernes", label: "Viernes" },
                    { key: "sabado", label: "Sábado" },
                    { key: "domingo", label: "Domingo" },
                  ].map(({ key, label }) => {
                    const day = openingHours[key as keyof typeof openingHours];
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px",
                          borderRadius: "8px",
                          background: "var(--surface2)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={day.abierto}
                          onChange={(e) =>
                            setOpeningHours((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key as keyof typeof prev],
                                abierto: e.target.checked,
                              },
                            }))
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                          }}
                        />
                        <span
                          style={{
                            minWidth: "70px",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          {label}
                        </span>
                        {day.abierto ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              marginLeft: "auto",
                            }}
                          >
                            <input
                              type="time"
                              value={day.inicio}
                              onChange={(e) =>
                                setOpeningHours((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key as keyof typeof prev],
                                    inicio: e.target.value,
                                  },
                                }))
                              }
                              style={{
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--text)",
                                fontSize: "0.85rem",
                              }}
                            />
                            <span
                              style={{ color: "var(--muted)", fontWeight: 500 }}
                            >
                              –
                            </span>
                            <input
                              type="time"
                              value={day.fin}
                              onChange={(e) =>
                                setOpeningHours((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key as keyof typeof prev],
                                    fin: e.target.value,
                                  },
                                }))
                              }
                              style={{
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--text)",
                                fontSize: "0.85rem",
                              }}
                            />
                          </div>
                        ) : (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: "0.85rem",
                              color: "var(--muted)",
                            }}
                          >
                            Cerrado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MAPA DE UBICACIÓN */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <label style={labelStyle}>Ubicación en el mapa *</label>
                  <button
                    className="btn btn-ghost"
                    onClick={handleMyLocation}
                    disabled={locating}
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      height: "auto",
                    }}
                  >
                    {locating ? "⏳" : "📍"} Mi ubicación
                  </button>
                </div>

                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    marginBottom: "10px",
                  }}
                >
                  Haz clic en el mapa para colocar el pin de tu negocio
                </p>

                {/* Minimapa */}
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    height: "280px",
                  }}
                >
                  {mapLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={mapCenter}
                      zoom={markerPos ? 16 : 13}
                      onClick={handleMapClick}
                      options={{
                        styles: darkMapStyle,
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      {markerPos && (
                        <Marker
                          position={markerPos}
                          draggable
                          onDragEnd={(e) => {
                            if (!e.latLng) return;
                            const lat = parseFloat(e.latLng.lat().toFixed(7));
                            const lng = parseFloat(e.latLng.lng().toFixed(7));
                            setMarkerPos({ lat, lng });
                            setLatInput(String(lat));
                            setLngInput(String(lng));
                          }}
                        />
                      )}
                    </GoogleMap>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "var(--muted)",
                        fontSize: "0.85rem",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid var(--teal)",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Cargando mapa...
                    </div>
                  )}
                </div>

                {/* Inputs de coordenadas */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "4px" }}>
                      Latitud
                    </label>
                    <input
                      className="input"
                      placeholder="19.0414"
                      value={latInput}
                      onChange={(e) => handleLatChange(e.target.value)}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "4px" }}>
                      Longitud
                    </label>
                    <input
                      className="input"
                      placeholder="-98.2063"
                      value={lngInput}
                      onChange={(e) => handleLngChange(e.target.value)}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {markerPos && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--teal)",
                      marginTop: "6px",
                      textAlign: "center",
                    }}
                  >
                    ✅ Ubicación seleccionada — también puedes arrastrar el pin
                    para ajustar
                  </p>
                )}
              </div>

              {/* Mensajes */}
              {successMsg && (
                <div
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "var(--teal-lt)",
                    fontSize: "0.88rem",
                  }}
                >
                  ✅ {successMsg}
                </div>
              )}
              {errorMsg && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "var(--danger)",
                    fontSize: "0.88rem",
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                className="btn btn-orange"
                onClick={createBusiness}
                disabled={uploading}
                style={{ width: "100%", padding: "14px", fontSize: "1rem" }}
              >
                {uploading ? "⏳ Subiendo..." : "Publicar negocio →"}
              </button>
            </div>

            <p
              style={{
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.78rem",
                marginTop: "1rem",
              }}
            >
              Tu negocio será revisado antes de aparecer en el mapa
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: "8px",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

// Estilo oscuro del mapa para que combine con el tema de la app
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0f0d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f0d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b9e82" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2820" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#111a15" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#1a3328" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1f18" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#111a15" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0d1f18" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#111a15" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#1a2820" }],
  },
];
