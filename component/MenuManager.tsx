"use client";

import { useState, useEffect, useRef } from "react";
import {
  getMenusByNegocio, createMenu, updateMenu, deleteMenu,
  createMenuCategory, updateMenuCategory, deleteMenuCategory,
  createMenuItem, updateMenuItem, deleteMenuItem,
} from "../services/supabase";
import { uploadImage } from "../services/cloudinary";
import { Menu, MenuCategory, MenuItem } from "../types/negocio";
import s from "./MenuManager.module.css";

interface MenuManagerProps {
  negocio_id: string;
}

export default function MenuManager({ negocio_id }: MenuManagerProps) {
  // Refs para file inputs
  const fileInputRefNewItem = useRef<HTMLInputElement>(null);
  const fileInputRefEditItem = useRef<HTMLInputElement>(null);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Estados de upload
  const [uploadingNewItemImage, setUploadingNewItemImage] = useState(false);
  const [uploadingEditItemImage, setUploadingEditItemImage] = useState(false);
  
  // Formularios
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  
  // Nuevo menú
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuDesc, setNewMenuDesc] = useState("");
  
  // Nueva categoría
  const [newCategoryMenuId, setNewCategoryMenuId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Nuevo item
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemImageUrl, setNewItemImageUrl] = useState("");
  
  // Edición
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingMenuName, setEditingMenuName] = useState("");
  const [editingMenuDesc, setEditingMenuDesc] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const [editingItemDesc, setEditingItemDesc] = useState("");
  const [editingItemImageUrl, setEditingItemImageUrl] = useState("");

  useEffect(() => {
    if (!negocio_id || negocio_id.trim() === "") {
      setLoading(false);
      return;
    }
    loadMenus();
  }, [negocio_id]);

  const loadMenus = async () => {
    if (!negocio_id || negocio_id.trim() === "") {
      console.warn("❌ MenuManager: negocio_id inválido", negocio_id);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("📡 Cargando menús para negocio_id:", negocio_id);
      const data = await getMenusByNegocio(negocio_id);
      console.log("✅ Menús cargados:", data);
      setMenus(data);
    } catch (error) {
      console.error("❌ Error cargando menús:", error);
      showMessage("❌ Error al cargar menús");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleImageChangeNewItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingNewItemImage(true);
    try {
      console.log("Subiendo imagen a Cloudinary...", file.name);
      const url = await uploadImage(file);
      console.log("Imagen subida:", url);
      setNewItemImageUrl(url);
      showMessage("Imagen cargada");
    } catch (error) {
      console.error("❌ Error al subir imagen:", error);
      showMessage("❌ Error al cargar imagen");
    } finally {
      setUploadingNewItemImage(false);
    }
    // Limpiar input
    if (fileInputRefNewItem.current) fileInputRefNewItem.current.value = "";
  };

  const handleImageChangeEditItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingEditItemImage(true);
    try {
      console.log("Subiendo imagen a Cloudinary...", file.name);
      const url = await uploadImage(file);
      console.log("Imagen subida:", url);
      setEditingItemImageUrl(url);
      showMessage("Imagen cargada");
    } catch (error) {
      console.error("❌ Error al subir imagen:", error);
      showMessage("❌ Error al cargar imagen");
    } finally {
      setUploadingEditItemImage(false);
    }
    // Limpiar input
    if (fileInputRefEditItem.current) fileInputRefEditItem.current.value = "";
  };

  // ─── MENÚS ─────────────────────────────────────────────────────────────────

  const handleAddMenu = async () => {
    if (!newMenuName.trim()) {
      showMessage("❌ El nombre del menú es requerido");
      return;
    }
    if (!negocio_id || negocio_id.trim() === "") {
      showMessage("❌ Error: negocio_id inválido");
      console.error("❌ handleAddMenu: negocio_id vacío", negocio_id);
      return;
    }
    console.log("Creando menú:", { negocio_id, newMenuName, newMenuDesc });
    const result = await createMenu(negocio_id, newMenuName, newMenuDesc);
    if (result) {
      console.log("Menú creado exitosamente:", result);
      showMessage("Menú creado");
      setNewMenuName("");
      setNewMenuDesc("");
      await loadMenus();
    } else {
      console.error("Error al crear menú - result es null");
      showMessage("Error al crear menú");
    }
  };

  const handleUpdateMenu = async (menuId: string) => {
    if (!editingMenuName.trim()) {
      showMessage("❌ El nombre es requerido");
      return;
    }
    const success = await updateMenu(menuId, editingMenuName, editingMenuDesc);
    if (success) {
      showMessage("✅ Menú actualizado");
      setEditingMenuId(null);
      await loadMenus();
    } else {
      showMessage("❌ Error al actualizar");
    }
  };

  const handleDeleteMenu = async (menuId: string, menuName: string) => {
    if (!confirm(`¿Eliminar menú "${menuName}" y todo su contenido?`)) return;
    const success = await deleteMenu(menuId);
    if (success) {
      showMessage("Menú eliminado");
      await loadMenus();
    } else {
      showMessage("Error al eliminar");
    }
  };

  // ─── CATEGORÍAS ────────────────────────────────────────────────────────────

  const handleAddCategory = async (menuId: string) => {
    if (!newCategoryName.trim()) {
      showMessage(" El nombre de la categoría es requerido");
      return;
    }
    const result = await createMenuCategory(menuId, newCategoryName);
    if (result) {
      showMessage(" Categoría creada");
      setNewCategoryName("");
      setNewCategoryMenuId(null);
      await loadMenus();
    } else {
      showMessage(" Error al crear categoría");
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      showMessage(" El nombre es requerido");
      return;
    }
    const success = await updateMenuCategory(categoryId, editingCategoryName);
    if (success) {
      showMessage(" Categoría actualizada");
      setEditingCategoryId(null);
      await loadMenus();
    } else {
      showMessage(" Error al actualizar");
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Eliminar categoría "${categoryName}" y sus items?`)) return;
    const success = await deleteMenuCategory(categoryId);
    if (success) {
      showMessage("✅ Categoría eliminada");
      await loadMenus();
    } else {
      showMessage("❌ Error al eliminar");
    }
  };

  // ─── ITEMS ─────────────────────────────────────────────────────────────────

  const handleAddItem = async (categoryId: string) => {
    console.log("handleAddItem - Iniciando con:", { categoryId, newItemName, newItemPrice, newItemDesc, newItemImageUrl });
    
    if (!newItemName.trim() || !newItemPrice.trim()) {
      showMessage("❌ Nombre y precio son requeridos");
      return;
    }
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) {
      showMessage("❌ Precio inválido");
      return;
    }
    
    console.log(" Validación pasada. Creando item...");
    const result = await createMenuItem(
      categoryId,
      newItemName,
      price,
      newItemDesc || undefined,
      newItemImageUrl || undefined
    );
    
    if (result) {
      console.log("✅ Item creado exitosamente:", result);
      showMessage("✅ Item creado");
      setNewItemName("");
      setNewItemPrice("");
      setNewItemDesc("");
      setNewItemImageUrl("");
      setNewItemCategoryId(null);
      await loadMenus();
    } else {
      console.error("❌ createMenuItem retornó null");
      showMessage("❌ Error al crear item");
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!editingItemName.trim() || !editingItemPrice.trim()) {
      showMessage("❌ Nombre y precio son requeridos");
      return;
    }
    const price = parseFloat(editingItemPrice);
    if (isNaN(price) || price < 0) {
      showMessage("❌ Precio inválido");
      return;
    }
    const success = await updateMenuItem(
      itemId,
      editingItemName,
      price,
      editingItemDesc || undefined,
      true,
      editingItemImageUrl || undefined
    );
    if (success) {
      showMessage("Item actualizado");
      setEditingItemId(null);
      await loadMenus();
    } else {
      showMessage("❌ Error al actualizar");
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`¿Eliminar item "${itemName}"?`)) return;
    const success = await deleteMenuItem(itemId);
    if (success) {
      showMessage("Item eliminado");
      await loadMenus();
    } else {
      showMessage("❌ Error al eliminar");
    }
  };

  if (loading) {
    return <div className={s.container}><p className={s.loadingText}>Cargando menús...</p></div>;
  }

  return (
    <div className={s.container}>
      {message && <div className={`${s.message} ${message.includes("❌") ? s.messageError : s.messageSuccess}`}>{message}</div>}

      {/* CREAR NUEVO MENÚ */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Crear Nuevo Menú</h3>
        <div className={s.form}>
          <input
            type="text"
            className={s.input}
            placeholder="Ej: Menú del día, Bebidas, Desayunos"
            value={newMenuName}
            onChange={e => setNewMenuName(e.target.value)}
          />
          <input
            type="text"
            className={s.input}
            placeholder="Descripción (opcional)"
            value={newMenuDesc}
            onChange={e => setNewMenuDesc(e.target.value)}
          />
          <button className={s.btnAdd} onClick={handleAddMenu}>+ Crear Menú</button>
        </div>
      </div>

      {/* LISTA DE MENÚS */}
      {menus.length === 0 ? (
        <p className={s.emptyText}>No tienes menús aún. ¡Crea uno!</p>
      ) : (
        <div className={s.menusList}>
          {menus.map(menu => (
            <div key={menu.id} className={s.menuCard}>
              {/* HEADER DEL MENÚ */}
              <div className={s.menuHeader}>
                <div className={s.menuInfo}>
                  <h4 className={s.menuTitle}>{menu.name}</h4>
                  {menu.description && <p className={s.menuDesc}>{menu.description}</p>}
                  <p className={s.menuMeta}>{menu.menu_categories?.length ?? 0} categorías</p>
                </div>
                <div className={s.menuActions}>
                  <button
                    className={s.btnExpand}
                    onClick={() => setExpandedMenuId(expandedMenuId === menu.id ? null : menu.id)}
                  >
                    {expandedMenuId === menu.id ? "▼" : "▶"}
                  </button>
                  <button
                    className={s.btnEdit}
                    onClick={() => {
                      setEditingMenuId(menu.id);
                      setEditingMenuName(menu.name);
                      setEditingMenuDesc(menu.description || "");
                    }}
                  >
                    ✎
                  </button>
                  <button className={s.btnDelete} onClick={() => handleDeleteMenu(menu.id, menu.name)}>
                    🗑
                  </button>
                </div>
              </div>

              {/* EDICIÓN DE MENÚ */}
              {editingMenuId === menu.id && (
                <div className={s.editForm}>
                  <input
                    type="text"
                    className={s.input}
                    value={editingMenuName}
                    onChange={e => setEditingMenuName(e.target.value)}
                  />
                  <input
                    type="text"
                    className={s.input}
                    value={editingMenuDesc}
                    onChange={e => setEditingMenuDesc(e.target.value)}
                  />
                  <div className={s.formActions}>
                    <button className={s.btnPrimary} onClick={() => handleUpdateMenu(menu.id)}>
                      Guardar
                    </button>
                    <button className={s.btnSecondary} onClick={() => setEditingMenuId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* CATEGORÍAS */}
              {expandedMenuId === menu.id && (
                <div className={s.categoriesSection}>
                  <div className={s.sectionTitle}>Categorías</div>

                  {/* CREAR NUEVA CATEGORÍA */}
                  {newCategoryMenuId === menu.id ? (
                    <div className={s.form}>
                      <input
                        type="text"
                        className={s.input}
                        placeholder="Ej: Entradas, Platos fuertes, Bebidas"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                      />
                      <div className={s.formActions}>
                        <button className={s.btnPrimary} onClick={() => handleAddCategory(menu.id)}>
                          Agregar
                        </button>
                        <button className={s.btnSecondary} onClick={() => setNewCategoryMenuId(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className={s.btnAddCategory} onClick={() => setNewCategoryMenuId(menu.id)}>
                      + Nueva Categoría
                    </button>
                  )}

                  {/* CATEGORÍAS EXISTENTES */}
                  {menu.menu_categories && menu.menu_categories.length > 0 ? (
                    <div className={s.categoriesList}>
                      {menu.menu_categories.map(category => (
                        <div key={category.id} className={s.categoryCard}>
                          {/* HEADER DE CATEGORÍA */}
                          <div className={s.categoryHeader}>
                            <div className={s.categoryInfo}>
                              {editingCategoryId === category.id ? (
                                <input
                                  type="text"
                                  className={s.input}
                                  value={editingCategoryName}
                                  onChange={e => setEditingCategoryName(e.target.value)}
                                />
                              ) : (
                                <>
                                  <h5 className={s.categoryTitle}>{category.name}</h5>
                                  <p className={s.categoryMeta}>{category.menu_items?.length ?? 0} items</p>
                                </>
                              )}
                            </div>
                            <div className={s.categoryActions}>
                              {editingCategoryId === category.id ? (
                                <>
                                  <button className={s.btnPrimary} onClick={() => handleUpdateCategory(category.id)}>
                                    ✓
                                  </button>
                                  <button className={s.btnSecondary} onClick={() => setEditingCategoryId(null)}>
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={s.btnEdit}
                                    onClick={() => {
                                      setEditingCategoryId(category.id);
                                      setEditingCategoryName(category.name);
                                    }}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className={s.btnDelete}
                                    onClick={() => handleDeleteCategory(category.id, category.name)}
                                  >
                                    🗑
                                  </button>
                                </>
                              )}
                              <button
                                className={s.btnExpand}
                                onClick={() =>
                                  setExpandedCategoryId(expandedCategoryId === category.id ? null : category.id)
                                }
                              >
                                {expandedCategoryId === category.id ? "▼" : "▶"}
                              </button>
                            </div>
                          </div>

                          {/* ITEMS */}
                          {expandedCategoryId === category.id && (
                            <div className={s.itemsSection}>
                              {/* CREAR NUEVO ITEM */}
                              {newItemCategoryId === category.id ? (
                                <div className={s.form}>
                                  <input
                                    type="text"
                                    className={s.input}
                                    placeholder="Nombre del item"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    className={s.input}
                                    placeholder="Precio"
                                    step="0.01"
                                    value={newItemPrice}
                                    onChange={e => setNewItemPrice(e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    className={s.input}
                                    placeholder="Descripción (opcional)"
                                    value={newItemDesc}
                                    onChange={e => setNewItemDesc(e.target.value)}
                                  />
                                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <button 
                                      className={s.btnSecondary} 
                                      onClick={() => fileInputRefNewItem.current?.click()}
                                      disabled={uploadingNewItemImage}
                                    >
                                      {uploadingNewItemImage ? "Subiendo..." : "📷 Cargar imagen"}
                                    </button>
                                    {newItemImageUrl && (
                                      <span style={{ fontSize: "0.85rem", color: "#a8e6a1" }}>✓ Imagen cargada</span>
                                    )}
                                  </div>
                                  <input
                                    ref={fileInputRefNewItem}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChangeNewItem}
                                    style={{ display: "none" }}
                                  />
                                  <div className={s.formActions}>
                                    <button className={s.btnPrimary} onClick={() => handleAddItem(category.id)}>
                                      Agregar Item
                                    </button>
                                    <button className={s.btnSecondary} onClick={() => setNewItemCategoryId(null)}>
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button className={s.btnAddItem} onClick={() => setNewItemCategoryId(category.id)}>
                                  + Nuevo Item
                                </button>
                              )}

                              {/* ITEMS EXISTENTES */}
                              {category.menu_items && category.menu_items.length > 0 ? (
                                <div className={s.itemsList}>
                                  {category.menu_items.map(item => (
                                    <div key={item.id} className={s.itemCard}>
                                      {editingItemId === item.id ? (
                                        <div className={s.itemEdit}>
                                          <input
                                            type="text"
                                            className={s.input}
                                            value={editingItemName}
                                            onChange={e => setEditingItemName(e.target.value)}
                                          />
                                          <input
                                            type="number"
                                            className={s.input}
                                            step="0.01"
                                            value={editingItemPrice}
                                            onChange={e => setEditingItemPrice(e.target.value)}
                                          />
                                          <input
                                            type="text"
                                            className={s.input}
                                            value={editingItemDesc}
                                            onChange={e => setEditingItemDesc(e.target.value)}
                                          />
                                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                            <button 
                                              className={s.btnSecondary} 
                                              onClick={() => fileInputRefEditItem.current?.click()}
                                              disabled={uploadingEditItemImage}
                                            >
                                              {uploadingEditItemImage ? "Subiendo..." : "📷 Cambiar imagen"}
                                            </button>
                                            {editingItemImageUrl && (
                                              <span style={{ fontSize: "0.85rem", color: "#a8e6a1" }}>✓ Cargada</span>
                                            )}
                                          </div>
                                          <input
                                            ref={fileInputRefEditItem}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChangeEditItem}
                                            style={{ display: "none" }}
                                          />
                                          <div className={s.formActions}>
                                            <button className={s.btnPrimary} onClick={() => handleUpdateItem(item.id)}>
                                              ✓
                                            </button>
                                            <button className={s.btnSecondary} onClick={() => setEditingItemId(null)}>
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className={s.itemInfo}>
                                            <div className={s.itemName}>{item.name}</div>
                                            <div className={s.itemPrice}>${item.price.toFixed(2)}</div>
                                            {item.description && <div className={s.itemDesc}>{item.description}</div>}
                                          </div>
                                          <div className={s.itemActions}>
                                            <button
                                              className={s.btnEdit}
                                              onClick={() => {
                                                setEditingItemId(item.id);
                                                setEditingItemName(item.name);
                                                setEditingItemPrice(item.price.toString());
                                                setEditingItemDesc(item.description || "");
                                                setEditingItemImageUrl(item.image_url || "");
                                              }}
                                            >
                                              ✎
                                            </button>
                                            <button
                                              className={s.btnDelete}
                                              onClick={() => handleDeleteItem(item.id, item.name)}
                                            >
                                              🗑
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className={s.emptyText}>No hay items en esta categoría</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={s.emptyText}>Sin categorías aún</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
